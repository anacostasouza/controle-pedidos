/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import {
  buscarClienteOmie,
  registrarAtendimento,
  buscarServicosAtendimento,
  type ServicoAtendimento
} from '../../../services/AtendimentoServices';
import { useAuth } from '../../../context/AuthContext';
import { ModalSelecionarCliente } from './ModalSelecionarCliente';
import '../../../styles/FilaAtendimento.css';

interface RegistroAtendimentoProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegistroAtendimento({ onClose, onSuccess }: Readonly<RegistroAtendimentoProps>) {
  const { user } = useAuth();
  const [etapa, setEtapa] = useState('formulario');
  const [servicos, setServicos] = useState<ServicoAtendimento[]>([]);

  const [formData, setFormData] = useState({
    nomeCliente: '',
    codigoPedido: '',
    codigoClienteOmie: '',
    isConsumidor: false,
    atendente: '',
    atendenteUid: '',
    tipoAtendimento: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [showClientesList, setShowClientesList] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [errorBuscaCliente, setErrorBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(false);

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

  const detectarTipoBusca = (termo: string): { razao_social: string; cnpj_cpf: string } => {
    const termoLimpo = termo.trim();
    const apenasNumeros = termoLimpo.replaceAll(/[.\-/]/g, '');
    
    const isCpfCnpj = /^\d+$/.test(apenasNumeros) && (apenasNumeros.length === 11 || apenasNumeros.length === 14);
    
    if (isCpfCnpj) {
      return { razao_social: '', cnpj_cpf: apenasNumeros };
    } else {
      return { razao_social: termoLimpo, cnpj_cpf: '' };
    }
  };

  const buscarClientesOmiePorTermo = async (term: string) => {
    setBuscandoCliente(true);
    setErrorBuscaCliente('');
    try {
      const { razao_social, cnpj_cpf } = detectarTipoBusca(term);
      const clientesFiltro = [{ razao_social, cnpj_cpf }];
      
      const resultado = await buscarClienteOmie(clientesFiltro);
      const lista = Array.isArray(resultado?.clientes) ? resultado.clientes : [];
      
      setClientesEncontrados(lista);
      setShowClientesList(lista.length > 0); 
      return lista;
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setErrorBuscaCliente('Erro ao buscar clientes. Tente novamente.');
      setClientesEncontrados([]);
      setShowClientesList(false);
      return [];
    } finally {
      setBuscandoCliente(false);
    }
  };

  const debouncedSearchCliente = useCallback(
    debounce(async (term: string) => {
      if (!term || term.trim().length < 3) {
        setClientesEncontrados([]);
        setShowClientesList(false);
        return;
      }
      await buscarClientesOmiePorTermo(term.trim());
    }, 800), 
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearchCliente.cancel();
    };
  }, [debouncedSearchCliente]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setErrorBuscaCliente('');

    if (formData.isConsumidor) {
      setFormData(prev => ({ ...prev, nomeCliente: value }));
      return;
    }

    if (clienteSelecionado) return;

    if (selectedClientName && value !== selectedClientName) {
      setSelectedClientName('');
      setFormData(prev => ({ ...prev, codigoClienteOmie: '' }));
    }

    if (selectedClientName && value === selectedClientName) {
      setFormData(prev => ({ ...prev, nomeCliente: selectedClientName }));
      return;
    }

    setFormData(prev => ({ ...prev, codigoClienteOmie: '' }));
    debouncedSearchCliente(value);
  };

  const handleSearchBlur = async () => {
    if (formData.isConsumidor || clienteSelecionado) return;
    const term = (searchTerm || '').trim();
    if (term.length < 3) return;

    if (selectedClientName && term === selectedClientName) return;

    if (debouncedSearchCliente.cancel) {
      debouncedSearchCliente.cancel();
    }
    await buscarClientesOmiePorTermo(term);
  };

  const limparSelecao = () => {
    setSearchTerm('');
    setSelectedClientName('');
    setClienteSelecionado(false);
    setFormData(prev => ({
      ...prev,
      nomeCliente: '',
      codigoClienteOmie: ''
    }));
    setClientesEncontrados([]);
    setShowClientesList(false);
    setErrorBuscaCliente('');
  };

  const selecionarCliente = (cliente: any) => {
    const nome = cliente.nome || '';
    setFormData(prev => ({
      ...prev,
      nomeCliente: nome,
      codigoClienteOmie: cliente.codigo_cliente_omie?.toString() || ''
    }));
    setShowClientesList(false);
    setClientesEncontrados([]);
    setSearchTerm(nome);
    setSelectedClientName(nome);
    setClienteSelecionado(true);
    setErrorBuscaCliente('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    if (name === 'isConsumidor') {
      if (newValue === true) {
        setFormData(prev => ({ 
          ...prev, 
          codigoClienteOmie: '', 
          isConsumidor: true,
          nomeCliente: searchTerm
        }));
        setClientesEncontrados([]);
        setShowClientesList(false);
        setClienteSelecionado(false);
        setErrorBuscaCliente('');
      } else {
        setFormData(prev => ({ ...prev, isConsumidor: false, nomeCliente: '' }));
        setSearchTerm('');
        setSelectedClientName('');
        setClienteSelecionado(false);
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeSalvo = (formData.nomeCliente || '').trim();
    const termoEntrada = (searchTerm || '').trim();

    if (!nomeSalvo && !termoEntrada) {
      setErrorBuscaCliente('Por favor, preencha o nome do cliente ou CPF/CNPJ.');
      return;
    }

    if (!formData.tipoAtendimento) {
      setErrorBuscaCliente('Por favor, selecione o tipo de atendimento.');
      return;
    }

    if (!formData.isConsumidor && !formData.codigoClienteOmie) {
      setErrorBuscaCliente('Por favor, selecione um cliente da lista ou marque como consumidor.');
      return;
    }

    const baseAtendimento: any = {
      nomeCliente: formData.nomeCliente || searchTerm,
      codigoPedido: formData.codigoPedido || '',
      tipoAtendimento: formData.tipoAtendimento,
      atendente: formData.atendente,
      atendenteUid: formData.atendenteUid,
      status: 'Finalizado',
      atendimentoDireto: true
    };

    if (formData.isConsumidor) {
      baseAtendimento.isConsumidor = true;
    } else {
      baseAtendimento.codigoClienteOmie = formData.codigoClienteOmie;
    }

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
    debouncedSearchCliente.cancel();
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
                  {formData.isConsumidor ? (
                    "Nome do Cliente *"
                  ) : (
                    "Nome do Cliente (Razão Social) / CPF/CNPJ *"
                  )}
                </label>
                <div className="cliente-input-container">
                  <input
                    id="clienteSearch"
                    name="clienteSearch"
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    onBlur={handleSearchBlur}
                    placeholder={
                      formData.isConsumidor 
                        ? "Digite o nome do cliente" 
                        : "Digite nome ou CPF/CNPJ"
                    }
                    required
                    disabled={clienteSelecionado && !formData.isConsumidor}
                    className="cliente-input"
                  />
                  {buscandoCliente && <span className="loading-spinner">Buscando...</span>}
                  {clienteSelecionado && !formData.isConsumidor && (
                    <button
                      type="button"
                      className="btn-limpar-selecao"
                      onClick={limparSelecao}
                      title="Limpar seleção e buscar novamente"
                    >
                      ×
                    </button>
                  )}
                </div>

                {showClientesList && clientesEncontrados.length > 0 && !clienteSelecionado && (
                  <div className="clientes-encontrados-lista">
                    {clientesEncontrados.map((cliente) => {
                      const semCpfCnpj =
                        !cliente.cnpj_cpf ||
                        cliente.cnpj_cpf === "**.**.***.****-**" ||
                        cliente.cnpj_cpf === "***.***.***.***-**";

                      return (
                        <div
                          key={cliente.codigo_cliente_omie}
                          className={`cliente-item ${semCpfCnpj ? 'cliente-sem-documento' : ''}`}
                        >
                          <div className="cliente-item-header">
                            <div className="cliente-item-info">
                              <div className="cliente-item-nome">
                                {cliente.nome}
                                {semCpfCnpj && <span className="aviso-sem-documento"> (Sem CPF/CNPJ)</span>}
                              </div>
                              {cliente.cnpj_cpf && <div className="cliente-item-cnpj">{cliente.cnpj_cpf}</div>}
                              {cliente.telefone && <div className="cliente-item-telefone">{cliente.telefone}</div>}
                            </div>
                            <button
                              type="button"
                              className="btn-selecionar-cliente"
                              onClick={() => selecionarCliente(cliente)}
                              disabled={semCpfCnpj}
                            >
                              Selecionar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showClientesList && clientesEncontrados.length === 0 && !buscandoCliente && (
                  <div className="clientes-encontrados-lista">
                    <div className="nenhum-cliente">Nenhum cliente encontrado.</div>
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

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isConsumidor"
                    checked={formData.isConsumidor}
                    onChange={handleInputChange}
                  />
                  Cliente Consumidor (não registrado no Omie)
                </label>
                {formData.isConsumidor && (
                  <div className="consumidor-info">
                    <small>O cliente será registrado como consumidor e não será buscado no Omie.</small>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleClose}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Atendimento</button>
              </div>
            </form>
          )}

          <ModalSelecionarCliente
            open={false}
            clientes={clientesEncontrados}
            onBuscar={buscarClientesOmiePorTermo}
            onConfirm={(cliente: any, codigoPedido: string) => {
              setFormData(prev => ({
                ...prev,
                nomeCliente: cliente.nome || prev.nomeCliente,
                codigoClienteOmie: cliente.codigo_cliente_omie?.toString() || '',
                codigoPedido: codigoPedido || prev.codigoPedido || ''
              }));
              setClientesEncontrados([]);
              setShowClientesList(false);
              setSearchTerm('');
              setEtapa('formulario');
            }}
            dadosBusca={{ nome: searchTerm }}
            setDadosBusca={() => {}}
          />
        </div>
      </div>
    </div>
  );
}