/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
  registrarAtendimento,
  buscarServicosAtendimento,
  type ServicoAtendimento
} from '../../../services/AtendimentoServices';
import { useAuth } from '../../../context/AuthContext';
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

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setErrorBuscaCliente('');
    setFormData(prev => ({
      ...prev,
      nomeCliente: value,
      codigoClienteOmie: ''
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    if (name === 'isConsumidor') return;

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

    const baseAtendimento: any = {
      nomeCliente: formData.nomeCliente || searchTerm,
      codigoPedido: formData.codigoPedido || '',
      tipoAtendimento: formData.tipoAtendimento,
      atendente: formData.atendente,
      atendenteUid: formData.atendenteUid,
      status: 'Finalizado',
      atendimentoDireto: true,
      isConsumidor: true,
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
                </div>
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

              <div className="consumidor-info">
                <small>Busca Omie desativada temporariamente. O cliente será registrado por preenchimento manual.</small>
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