/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import {
  registrarAtendimento,
  buscarServicosAtendimento,
  buscarClienteTagPlus,
  type ServicoAtendimento
} from '../../../services/AtendimentoServices';
import { useAuth } from '../../../context/AuthContext';
import '../../../styles/FilaAtendimento.css';

interface RegistroAtendimentoProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface ClienteTagPlus {
  nome?: string;
  razao_social?: string;
  nome_fantasia?: string;
  fantasia?: string;
  cnpj_cpf?: string;
  cnpj?: string;
  cpf?: string;
  codigo_cliente_omie?: number | string;
  codigo_cliente?: number | string;
  codigo?: number | string;
  id?: number | string;
  telefone?: string;
}

const formatarCpfCnpj = (valor?: string): string => {
  const numeros = String(valor ?? '').replace(/\D/g, '');
  const ultimosQuatro = numeros.slice(-4);

  if (!ultimosQuatro) {
    return '';
  }

  if (numeros.length === 11) {
    return `***.***.***-${ultimosQuatro}`;
  }
  if (numeros.length === 14) {
    return `**.***.***/****-${ultimosQuatro}`;
  }
  return ultimosQuatro;
};

const TEMPO_DEBOUNCE_BUSCA_CLIENTE = 1400;

export default function RegistroAtendimento({ onClose, onSuccess }: Readonly<RegistroAtendimentoProps>) {
  const { user } = useAuth();
  const [etapa] = useState('formulario');
  const [servicos, setServicos] = useState<ServicoAtendimento[]>([]);
  const clienteSelecionadoRef = useRef('');
  const clienteSelecionadoDetalheRef = useRef<ClienteTagPlus | null>(null);
  const [formData, setFormData] = useState({
    nomeCliente: '',
    codigoPedido: '',
    codigoClienteTagPlus: '',
    isConsumidor: false,
    atendente: '',
    atendenteUid: '',
    tipoAtendimento: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteTagPlus | null>(null);
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteTagPlus[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [buscaExecutada, setBuscaExecutada] = useState(false);
  const [errorBuscaCliente, setErrorBuscaCliente] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        atendente: (user as any).displayName || '',
        atendenteUid: (user as any).uid || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const carregarServicos = async () => {
      try {
        const servicosAtendimento = await buscarServicosAtendimento();
        setServicos(servicosAtendimento);
        if (servicosAtendimento.length > 0) {
          setFormData(prev => ({ ...prev, tipoAtendimento: servicosAtendimento[0].tipo }));
        }
      } catch (error) {
        console.error('Erro ao carregar serviços de atendimento:', error);
      }
    };

    carregarServicos();
  }, []);

  useEffect(() => {
    if (formData.isConsumidor) {
      setClientesEncontrados([]);
      setBuscandoCliente(false);
      setBuscaExecutada(false);
      return;
    }

    const termo = searchTerm.trim();
    if (termo.length < 3) {
      setClientesEncontrados([]);
      setBuscaExecutada(false);
      setBuscandoCliente(false);
      return;
    }

    if (clienteSelecionadoRef.current === termo) {
      setBuscandoCliente(false);
      return;
    }

    setBuscandoCliente(true);
    setBuscaExecutada(false);

    const timeoutId = globalThis.setTimeout(async () => {
      try {
        const resultadoBusca = await buscarClienteTagPlus(termo);
        const listaClientes = Array.isArray(resultadoBusca?.clientes)
          ? resultadoBusca.clientes
          : [];

        setClientesEncontrados(
          listaClientes.filter((cliente: ClienteTagPlus) => {
            const documento = String(cliente.cnpj_cpf || cliente.cnpj || cliente.cpf || '').replace(/\D/g, '');
            return Boolean(documento);
          })
        );
        setBuscaExecutada(true);
      } catch (error) {
        console.error('Erro ao buscar cliente na TagPlus:', error);
        setClientesEncontrados([]);
        setBuscaExecutada(true);
      } finally {
        setBuscandoCliente(false);
      }
    }, TEMPO_DEBOUNCE_BUSCA_CLIENTE);

    return () => globalThis.clearTimeout(timeoutId);
  }, [searchTerm, formData.isConsumidor]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    clienteSelecionadoRef.current = '';
    clienteSelecionadoDetalheRef.current = null;
    setSearchTerm(value);
    setErrorBuscaCliente('');
    setClienteSelecionado(null);
    setBuscaExecutada(false);
    setFormData(prev => ({
      ...prev,
      nomeCliente: value,
      codigoClienteTagPlus: ''
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData(prev => ({ ...prev, [name]: newValue }));

    if (name === 'isConsumidor' && newValue) {
      setClienteSelecionado(null);
      setClientesEncontrados([]);
      setBuscaExecutada(false);
      setBuscandoCliente(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipoAtendimento) {
      setErrorBuscaCliente('Por favor, selecione o tipo de atendimento.');
      return;
    }

    const clienteConfirmado = clienteSelecionadoDetalheRef.current ?? clienteSelecionado;

    if (!formData.isConsumidor && !clienteConfirmado) {
      setErrorBuscaCliente('Selecione um cliente da lista da TagPlus ou marque Cliente consumidor.');
      return;
    }

    const baseAtendimento: any = {
      nomeCliente: formData.isConsumidor
        ? (formData.nomeCliente || searchTerm || 'Cliente Consumidor')
        : (clienteConfirmado?.nome || formData.nomeCliente || searchTerm),
      codigoPedido: formData.codigoPedido || '',
      tipoAtendimento: formData.tipoAtendimento,
      atendente: formData.atendente,
      atendenteUid: formData.atendenteUid,
      status: 'Finalizado',
      atendimentoDireto: true,
      isConsumidor: formData.isConsumidor,
      codigoClienteTagPlus: formData.isConsumidor
        ? ''
        : String(
            clienteConfirmado?.codigo_cliente_omie ??
            clienteConfirmado?.codigo_cliente ??
            clienteConfirmado?.codigo ??
            clienteConfirmado?.id ??
            ''
          ),
    };

    try {
      await registrarAtendimento(baseAtendimento);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar atendimento:', error);
      setErrorBuscaCliente('Erro ao registrar atendimento. Tente novamente.');
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="modal-registro-direto-bg">
      <div className="modal-registro-direto">
        <div className="modal-header">
          <h2>Registro Direto de Atendimento</h2>
          <button className="btn-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {errorBuscaCliente && (
            <div className="erro-mensagem">
              {errorBuscaCliente}
            </div>
          )}

          {etapa === 'formulario' && (
            <form onSubmit={handleSubmitForm}>
              <div className="form-group">
                <label htmlFor="clienteSearch">
                  Nome do Cliente *
                </label>
                <div className="cliente-input-container">
                  <input
                    id="clienteSearch"
                    name="clienteSearch"
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Digite manualmente o nome do cliente"
                    required
                    className="cliente-input"
                  />
                  {!formData.isConsumidor && buscandoCliente && searchTerm.trim().length >= 3 && (
                    <div className="cliente-busca-status">Buscando clientes na TagPlus...</div>
                  )}

                  {!formData.isConsumidor && clientesEncontrados.length > 0 && (
                    <div className="clientes-encontrados-lista">
                      {clientesEncontrados.map((cliente: ClienteTagPlus) => {
                        const nomeClienteEncontrado =
                          cliente.nome ||
                          cliente.razao_social ||
                          cliente.nome_fantasia ||
                          cliente.fantasia ||
                          'Cliente sem nome';
                        const cpfCnpj = String(cliente.cnpj_cpf || cliente.cnpj || cliente.cpf || '').replace(/\D/g, '');

                        return (
                          <button
                            key={String(cliente.codigo_cliente_omie ?? cliente.codigo_cliente ?? cliente.codigo ?? cliente.id ?? nomeClienteEncontrado)}
                            type="button"
                            className="cliente-encontrado-item"
                            onClick={() => {
                              clienteSelecionadoRef.current = nomeClienteEncontrado;
                              clienteSelecionadoDetalheRef.current = cliente;
                              setClienteSelecionado(cliente);
                              setSearchTerm(nomeClienteEncontrado);
                              setFormData(prev => ({
                                ...prev,
                                nomeCliente: nomeClienteEncontrado,
                                codigoClienteTagPlus: String(
                                  cliente.codigo_cliente_omie ??
                                  cliente.codigo_cliente ??
                                  cliente.codigo ??
                                  cliente.id ??
                                  ''
                                ),
                              }));
                              setErrorBuscaCliente('');
                              setClientesEncontrados([]);
                              setBuscaExecutada(true);
                            }}
                          >
                            <strong>{nomeClienteEncontrado}</strong>
                            {cpfCnpj && <span>CPF/CNPJ: {formatarCpfCnpj(cpfCnpj)}</span>}
                            {cliente.telefone && <span>Telefone: {cliente.telefone}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!formData.isConsumidor && buscaExecutada && !buscandoCliente && searchTerm.trim().length >= 3 && clientesEncontrados.length === 0 && clienteSelecionadoRef.current !== searchTerm.trim() && (
                  <div className="cliente-sem-resultados">
                    Nenhum cliente encontrado na TagPlus.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="tipo-de-atendimento">Tipo de Atendimento*</label>
                <div id="servicos-radio-group">
                  {servicos.map(servico => (
                    <label key={servico.tipo}>
                      <input
                        type="radio"
                        name="tipoAtendimento"
                        value={servico.tipo}
                        checked={formData.tipoAtendimento === servico.tipo}
                        onChange={handleInputChange}
                        required
                      />
                      {servico.tipo}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="codigoPedido">Código do Pedido *</label>
                <input
                  type="text"
                  id="codigoPedido"
                  name="codigoPedido"
                  value={formData.codigoPedido}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="consumidor-option">
                <label>
                  <input
                    type="checkbox"
                    name="isConsumidor"
                    checked={formData.isConsumidor}
                    onChange={handleInputChange}
                  />
                  Cliente consumidor
                </label>
              </div>

              <div className="consumidor-info">
                <small>
                  Quando marcado, o cliente é registrado sem validação na TagPlus.
                </small>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleClose}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Atendimento</button>
              </div>
            </form>
          )}

          {null}
        </div>
      </div>
    </div>
  );
}