import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Trash2, Edit2, Save, X, Move, Grid, FileText } from 'lucide-react';

const SistemaOrcamentoMarmore = () => {
  const [materiais, setMateriais] = useState([
    { id: 1, nome: 'Mármore Branco Carrara', comprimento: 3000, altura: 2000, custo: 1500 }
  ]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [orcamentoAtual, setOrcamentoAtual] = useState(null);
  const [tela, setTela] = useState('lista'); // lista, novo-material, orcamento, plano-corte
  const [novoMaterial, setNovoMaterial] = useState({ nome: '', comprimento: '', altura: '', custo: '' });
  const [ambienteSelecionado, setAmbienteSelecionado] = useState(null);
  const [editandoPeca, setEditandoPeca] = useState(null);
  const [pecaArrastando, setPecaArrastando] = useState(null);
  const [chapaDestaque, setChapaDestaque] = useState(null);

  // Criar novo orçamento
  const criarOrcamento = () => {
    const novoOrc = {
      id: Date.now(),
      data: new Date().toLocaleDateString(),
      ambientes: [],
      chapas: []
    };
    setOrcamentoAtual(novoOrc);
    setTela('orcamento');
  };

  // Adicionar ambiente
  const adicionarAmbiente = (nome) => {
    if (!nome.trim()) return;
    setOrcamentoAtual({
      ...orcamentoAtual,
      ambientes: [...orcamentoAtual.ambientes, { id: Date.now(), nome, pecas: [] }]
    });
  };

  // Adicionar peça
  const adicionarPeca = (ambienteId, peca) => {
    const novasPecas = [];
    for (let i = 0; i < (peca.quantidade || 1); i++) {
      novasPecas.push({
        ...peca,
        id: Date.now() + i + Math.random(),
        quantidade: 1,
        ambienteId,
        chapaId: null,
        posX: 0,
        posY: 0,
        rotacao: 0 // 0 = normal, 90 = girada 90 graus
      });
    }

    const ambientes = orcamentoAtual.ambientes.map(amb => {
      if (amb.id === ambienteId) {
        return { ...amb, pecas: [...amb.pecas, ...novasPecas] };
      }
      return amb;
    });
    
    const novoOrcamento = { ...orcamentoAtual, ambientes };
    setOrcamentoAtual(novoOrcamento);
    
    // Reorganizar todas as peças
    setTimeout(() => {
      organizarPecasEmChapas(novoOrcamento);
    }, 0);
  };

  // Organizar peças em chapas automaticamente
  const organizarPecasEmChapas = (orcamento) => {
    const todasPecas = orcamento.ambientes.flatMap(amb => amb.pecas);
    const chapas = [];
    const espacamento = 4;

    // Agrupar por material
    const pecasPorMaterial = {};
    todasPecas.forEach(peca => {
      if (!pecasPorMaterial[peca.materialId]) {
        pecasPorMaterial[peca.materialId] = [];
      }
      pecasPorMaterial[peca.materialId].push(peca);
    });

    // Para cada material, organizar em chapas
    Object.keys(pecasPorMaterial).forEach(materialId => {
      const material = materiais.find(m => m.id === parseInt(materialId));
      if (!material) return;

      const pecas = pecasPorMaterial[materialId];
      let chapaAtual = null;

      pecas.forEach(peca => {
        let colocada = false;

        // Tentar colocar nas chapas existentes primeiro
        for (let chapa of chapas.filter(c => c.materialId === parseInt(materialId))) {
          const pos = encontrarPosicaoNaChapa(chapa, peca, material, espacamento);
          if (pos) {
            peca.chapaId = chapa.id;
            peca.posX = pos.x;
            peca.posY = pos.y;
            chapa.pecas.push(peca);
            colocada = true;
            break;
          }
        }

        // Se não coube em nenhuma chapa existente, criar nova
        if (!colocada) {
          const novaChapa = {
            id: Date.now() + Math.random(),
            materialId: parseInt(materialId),
            material,
            pecas: []
          };
          
          peca.chapaId = novaChapa.id;
          peca.posX = espacamento;
          peca.posY = espacamento;
          novaChapa.pecas.push(peca);
          chapas.push(novaChapa);
        }
      });
    });

    // Atualizar ambientes com as peças posicionadas
    const ambientesAtualizados = orcamento.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        const pecaAtualizada = todasPecas.find(tp => tp.id === p.id);
        return pecaAtualizada || p;
      })
    }));

    setOrcamentoAtual({ ...orcamento, chapas, ambientes: ambientesAtualizados });
  };

  // Encontrar posição para peça na chapa com espaçamento de 4mm
  const encontrarPosicaoNaChapa = (chapa, peca, material, espacamento) => {
    const larguraChapa = material.comprimento;
    const alturaChapa = material.altura;
    
    // Tentar diferentes posições, começando do canto superior esquerdo
    for (let y = espacamento; y + peca.altura + espacamento <= alturaChapa; y += 5) {
      for (let x = espacamento; x + peca.comprimento + espacamento <= larguraChapa; x += 5) {
        // Verificar se não sobrepõe com outras peças (considerando espaçamento de 4mm)
        const sobrepoe = chapa.pecas.some(p => {
          const distanciaX = Math.abs((x + peca.comprimento / 2) - (p.posX + p.comprimento / 2));
          const distanciaY = Math.abs((y + peca.altura / 2) - (p.posY + p.altura / 2));
          const somaLarguras = (peca.comprimento + p.comprimento) / 2 + espacamento;
          const somaAlturas = (peca.altura + p.altura) / 2 + espacamento;
          
          return distanciaX < somaLarguras && distanciaY < somaAlturas;
        });
        
        if (!sobrepoe) {
          return { x, y };
        }
      }
    }
    return null;
  };

  // Calcular totais
  const calcularOrcamento = () => {
    if (!orcamentoAtual) return { subtotal: 0, acabamentos: 0, recortes: 0, total: 0, chapas: [] };

    let totalChapas = 0;
    const chapasPorMaterial = {};

    // Contar chapas por material
    orcamentoAtual.chapas.forEach(chapa => {
      const key = chapa.materialId;
      chapasPorMaterial[key] = (chapasPorMaterial[key] || 0) + 1;
    });

    // Calcular custo das chapas
    Object.keys(chapasPorMaterial).forEach(materialId => {
      const material = materiais.find(m => m.id === parseInt(materialId));
      if (material) {
        totalChapas += material.custo * chapasPorMaterial[materialId];
      }
    });

    let totalAcabamentos = 0;
    let totalRecortes = 0;

    orcamentoAtual.ambientes.forEach(ambiente => {
      ambiente.pecas.forEach(peca => {
        // Acabamentos
        if (peca.esquadria) totalAcabamentos += (peca.esquadria / 1000) * 35;
        if (peca.boleado) totalAcabamentos += (peca.boleado / 1000) * 15;
        if (peca.polimento) totalAcabamentos += (peca.polimento / 1000) * 22;

        // Recortes
        if (peca.cuba) totalRecortes += peca.cuba * 100;
        if (peca.cubaEsculpida) totalRecortes += peca.cubaEsculpida * 630;
        if (peca.cooktop) totalRecortes += peca.cooktop * 150;
        if (peca.recorte) totalRecortes += peca.recorte * 60;
        if (peca.pes) totalRecortes += peca.pes * 200;
      });
    });

    return {
      subtotal: totalChapas,
      acabamentos: totalAcabamentos,
      recortes: totalRecortes,
      total: totalChapas + totalAcabamentos + totalRecortes,
      chapasPorMaterial
    };
  };

  // Calcular orçamento salvo (usa os materiais salvos no orçamento)
  const calcularOrcamentoSalvo = (orc) => {
    let totalChapas = 0;
    const chapasPorMaterial = {};

    // Contar chapas por material
    orc.chapas.forEach(chapa => {
      const key = chapa.materialId;
      chapasPorMaterial[key] = (chapasPorMaterial[key] || 0) + 1;
    });

    // Calcular custo das chapas
    Object.keys(chapasPorMaterial).forEach(materialId => {
      const material = materiais.find(m => m.id === parseInt(materialId));
      if (material) {
        totalChapas += material.custo * chapasPorMaterial[materialId];
      }
    });

    let totalAcabamentos = 0;
    let totalRecortes = 0;

    orc.ambientes.forEach(ambiente => {
      ambiente.pecas.forEach(peca => {
        // Acabamentos
        if (peca.esquadria) totalAcabamentos += (peca.esquadria / 1000) * 35;
        if (peca.boleado) totalAcabamentos += (peca.boleado / 1000) * 15;
        if (peca.polimento) totalAcabamentos += (peca.polimento / 1000) * 22;

        // Recortes
        if (peca.cuba) totalRecortes += peca.cuba * 100;
        if (peca.cubaEsculpida) totalRecortes += peca.cubaEsculpida * 630;
        if (peca.cooktop) totalRecortes += peca.cooktop * 150;
        if (peca.recorte) totalRecortes += peca.recorte * 60;
        if (peca.pes) totalRecortes += peca.pes * 200;
      });
    });

    return {
      subtotal: totalChapas,
      acabamentos: totalAcabamentos,
      recortes: totalRecortes,
      total: totalChapas + totalAcabamentos + totalRecortes,
      chapasPorMaterial
    };
  };

  // Mover peça entre chapas
  const moverPeca = (pecaId, novaChapaId, novaX, novaY) => {
    // Atualizar a peça nos ambientes
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => 
        p.id === pecaId ? { ...p, chapaId: novaChapaId, posX: novaX, posY: novaY } : p
      )
    }));

    // Reconstruir as chapas com base nas novas posições
    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    setOrcamentoAtual({ 
      ...orcamentoAtual, 
      ambientes: ambientesAtualizados, 
      chapas: chapasAtualizadas 
    });
  };

  // Girar peça
  const girarPeca = (pecaId, chapaId) => {
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        if (p.id === pecaId) {
          const novaRotacao = p.rotacao === 0 ? 90 : 0;
          return { ...p, rotacao: novaRotacao };
        }
        return p;
      })
    }));

    // Reconstruir as chapas
    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    setOrcamentoAtual({ 
      ...orcamentoAtual, 
      ambientes: ambientesAtualizados, 
      chapas: chapasAtualizadas 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Sistema de Orçamento - Mármore</h1>
          <p className="text-gray-600 mt-2">Gerencie materiais, orçamentos e planos de corte</p>
        </header>

        {/* Menu Principal */}
        {tela === 'lista' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card Materiais */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Materiais Cadastrados</h2>
                  <button
                    onClick={() => setTela('novo-material')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <PlusCircle size={20} />
                    Novo Material
                  </button>
                </div>
                <div className="space-y-3">
                  {materiais.map(mat => (
                    <div key={mat.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800">{mat.nome}</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                        <p>Chapa: {mat.comprimento} x {mat.altura} mm</p>
                        <p>Custo: R$ {mat.custo.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Orçamentos */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Orçamentos</h2>
                  <button
                    onClick={criarOrcamento}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <PlusCircle size={20} />
                    Novo Orçamento
                  </button>
                </div>
                <div className="space-y-3">
                  {orcamentos.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhum orçamento criado ainda</p>
                  ) : (
                    orcamentos.map(orc => {
                      const totalPecas = orc.ambientes.reduce((sum, amb) => sum + amb.pecas.length, 0);
                      const orcCalc = calcularOrcamentoSalvo(orc);
                      return (
                        <div 
                          key={orc.id} 
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setOrcamentoAtual(orc);
                                setTela('orcamento');
                              }}
                            >
                              <p className="font-semibold">Orçamento #{String(orc.id).slice(-6)}</p>
                              <p className="text-sm text-gray-600">Data: {orc.data}</p>
                              <p className="text-sm text-gray-600">{orc.ambientes.length} ambientes • {totalPecas} peças</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">R$ {orcCalc.total.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">{orc.chapas.length} chapas</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Deseja realmente excluir este orçamento?')) {
                                    setOrcamentos(orcamentos.filter(o => o.id !== orc.id));
                                  }
                                }}
                                className="mt-2 text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cadastro de Material */}
        {tela === 'novo-material' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Novo Material</h2>
              <button
                onClick={() => setTela('lista')}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Material</label>
                <input
                  type="text"
                  value={novoMaterial.nome}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: Mármore Branco Carrara"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comprimento da Chapa (mm)</label>
                <input
                  type="number"
                  value={novoMaterial.comprimento}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, comprimento: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="3000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Altura da Chapa (mm)</label>
                <input
                  type="number"
                  value={novoMaterial.altura}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, altura: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custo por Chapa (R$)</label>
                <input
                  type="number"
                  value={novoMaterial.custo}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, custo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1500.00"
                  step="0.01"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => {
                  if (novoMaterial.nome && novoMaterial.comprimento && novoMaterial.altura && novoMaterial.custo) {
                    setMateriais([...materiais, {
                      id: Date.now(),
                      nome: novoMaterial.nome,
                      comprimento: parseFloat(novoMaterial.comprimento),
                      altura: parseFloat(novoMaterial.altura),
                      custo: parseFloat(novoMaterial.custo)
                    }]);
                    setNovoMaterial({ nome: '', comprimento: '', altura: '', custo: '' });
                    setTela('lista');
                  }
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Salvar Material
              </button>
            </div>
          </div>
        )}

        {/* Tela de Orçamento */}
        {tela === 'orcamento' && orcamentoAtual && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Orçamento - {orcamentoAtual.data}
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTela('plano-corte')}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    <Grid size={20} />
                    Plano de Corte
                  </button>
                  <button
                    onClick={() => {
                      // Verificar se é um orçamento existente ou novo
                      const existe = orcamentos.find(o => o.id === orcamentoAtual.id);
                      
                      if (existe) {
                        // Atualizar orçamento existente
                        setOrcamentos(orcamentos.map(o => 
                          o.id === orcamentoAtual.id ? orcamentoAtual : o
                        ));
                        alert('Orçamento atualizado com sucesso!');
                      } else {
                        // Adicionar novo orçamento
                        setOrcamentos([...orcamentos, orcamentoAtual]);
                        alert('Orçamento salvo com sucesso!');
                      }
                      
                      setTela('lista');
                      setOrcamentoAtual(null);
                    }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Save size={20} />
                    Salvar Orçamento
                  </button>
                  <button
                    onClick={() => {
                      setTela('lista');
                      setOrcamentoAtual(null);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Adicionar Ambiente */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nome do ambiente (ex: Cozinha)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        adicionarAmbiente(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      adicionarAmbiente(input.value);
                      input.value = '';
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Adicionar Ambiente
                  </button>
                </div>
              </div>

              {/* Lista de Ambientes */}
              <div className="space-y-4">
                {orcamentoAtual.ambientes.map(ambiente => (
                  <AmbienteCard
                    key={ambiente.id}
                    ambiente={ambiente}
                    materiais={materiais}
                    onAdicionarPeca={(peca) => adicionarPeca(ambiente.id, peca)}
                  />
                ))}
              </div>
            </div>

            {/* Resumo do Orçamento */}
            <ResumoOrcamento orcamentoAtual={orcamentoAtual} materiais={materiais} />
          </div>
        )}

        {/* Plano de Corte */}
        {tela === 'plano-corte' && orcamentoAtual && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Plano de Corte</h2>
              <button
                onClick={() => setTela('orcamento')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
                Voltar
              </button>
            </div>

            <div className="space-y-6">
              {orcamentoAtual.chapas.map((chapa, idx) => (
                <PlanoCorteChapa
                  key={chapa.id}
                  chapa={chapa}
                  numero={idx + 1}
                  onMoverPeca={moverPeca}
                  onGirarPeca={girarPeca}
                  pecaArrastando={pecaArrastando}
                  setPecaArrastando={setPecaArrastando}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Card de Ambiente
const AmbienteCard = ({ ambiente, materiais, onAdicionarPeca }) => {
  const [expandido, setExpandido] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novaPeca, setNovaPeca] = useState({
    altura: '',
    comprimento: '',
    quantidade: 1,
    materialId: materiais[0]?.id || null,
    esquadria: '',
    boleado: '',
    polimento: '',
    cuba: 0,
    cubaEsculpida: 0,
    cooktop: 0,
    recorte: 0,
    pes: 0
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{ambiente.nome}</h3>
          <span className="text-sm text-gray-600">{ambiente.pecas.length} peças</span>
        </div>
      </div>

      {expandido && (
        <div className="p-4 space-y-4">
          {/* Lista de Peças */}
          {ambiente.pecas.map(peca => {
            const material = materiais.find(m => m.id === peca.materialId);
            return (
              <div key={peca.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <p><span className="font-medium">Dimensões:</span> {peca.comprimento} x {peca.altura} mm</p>
                  <p><span className="font-medium">Material:</span> {material?.nome}</p>
                  <p><span className="font-medium">Chapa:</span> #{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}</p>
                </div>
              </div>
            );
          })}

          {/* Botão Adicionar Peça */}
          {!mostrarForm && (
            <button
              onClick={() => setMostrarForm(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600"
            >
              + Adicionar Peça
            </button>
          )}

          {/* Formulário de Nova Peça */}
          {mostrarForm && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-3">Nova Peça</h4>
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Altura (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.altura}
                    onChange={(e) => setNovaPeca({ ...novaPeca, altura: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Comprimento (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.comprimento}
                    onChange={(e) => setNovaPeca({ ...novaPeca, comprimento: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={novaPeca.quantidade}
                    onChange={(e) => setNovaPeca({ ...novaPeca, quantidade: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="1"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium mb-1">Material</label>
                  <select
                    value={novaPeca.materialId}
                    onChange={(e) => setNovaPeca({ ...novaPeca, materialId: parseInt(e.target.value) })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    {materiais.map(mat => (
                      <option key={mat.id} value={mat.id}>{mat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h5 className="font-medium text-sm mb-2">Acabamentos (opcional)</h5>
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1">Esquadria (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.esquadria}
                    onChange={(e) => setNovaPeca({ ...novaPeca, esquadria: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Boleado/Canal (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.boleado}
                    onChange={(e) => setNovaPeca({ ...novaPeca, boleado: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Polimento (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.polimento}
                    onChange={(e) => setNovaPeca({ ...novaPeca, polimento: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <h5 className="font-medium text-sm mb-2">Recortes (opcional)</h5>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1">Cuba</label>
                  <input
                    type="number"
                    value={novaPeca.cuba}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cuba: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cuba Esculpida</label>
                  <input
                    type="number"
                    value={novaPeca.cubaEsculpida}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cubaEsculpida: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cooktop</label>
                  <input
                    type="number"
                    value={novaPeca.cooktop}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cooktop: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Recorte</label>
                  <input
                    type="number"
                    value={novaPeca.recorte}
                    onChange={(e) => setNovaPeca({ ...novaPeca, recorte: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Pés</label>
                  <input
                    type="number"
                    value={novaPeca.pes}
                    onChange={(e) => setNovaPeca({ ...novaPeca, pes: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (novaPeca.altura && novaPeca.comprimento && novaPeca.materialId) {
                      onAdicionarPeca({
                        ...novaPeca,
                        altura: parseFloat(novaPeca.altura),
                        comprimento: parseFloat(novaPeca.comprimento),
                        esquadria: parseFloat(novaPeca.esquadria) || 0,
                        boleado: parseFloat(novaPeca.boleado) || 0,
                        polimento: parseFloat(novaPeca.polimento) || 0
                      });
                      setNovaPeca({
                        altura: '',
                        comprimento: '',
                        quantidade: 1,
                        materialId: materiais[0]?.id || null,
                        esquadria: '',
                        boleado: '',
                        polimento: '',
                        cuba: 0,
                        cubaEsculpida: 0,
                        cooktop: 0,
                        recorte: 0,
                        pes: 0
                      });
                      setMostrarForm(false);
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setMostrarForm(false)}
                  className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente de Resumo do Orçamento
const ResumoOrcamento = ({ orcamentoAtual, materiais }) => {
  const orcamento = calcularOrcamentoComDetalhes(orcamentoAtual, materiais);
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold mb-4">Resumo do Orçamento</h3>
      
      {/* Chapas de Material */}
      <div className="mb-6">
        <div className="flex justify-between py-2 border-b-2 border-gray-300 mb-3">
          <span className="font-bold text-lg">Chapas de Material</span>
          <span className="font-bold text-lg">R$ {orcamento.subtotal.toFixed(2)}</span>
        </div>
        {Object.keys(orcamento.chapasPorMaterial || {}).map(materialId => {
          const material = materiais.find(m => m.id === parseInt(materialId));
          const qtd = orcamento.chapasPorMaterial[materialId];
          return (
            <div key={materialId} className="flex justify-between text-sm text-gray-700 pl-4 py-1">
              <span>{material?.nome} - {qtd}x chapa(s) de {material?.comprimento}x{material?.altura}mm</span>
              <span>R$ {(material?.custo * qtd).toFixed(2)}</span>
            </div>
          );
        })}
      </div>
      
      {/* Acabamentos Detalhados */}
      {orcamento.detalhesAcabamentos.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between py-2 border-b-2 border-gray-300 mb-3">
            <span className="font-bold text-lg">Acabamentos</span>
            <span className="font-bold text-lg">R$ {orcamento.acabamentos.toFixed(2)}</span>
          </div>
          {orcamento.detalhesAcabamentos.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700 pl-4 py-1 border-b border-gray-100">
              <div>
                <span className="font-medium">{item.tipo}</span>
                <span className="text-gray-500 ml-2">({item.medida})</span>
                <div className="text-xs text-gray-500">{item.peca}</div>
              </div>
              <span>R$ {item.valor.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Recortes Detalhados */}
      {orcamento.detalhesRecortes.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between py-2 border-b-2 border-gray-300 mb-3">
            <span className="font-bold text-lg">Recortes</span>
            <span className="font-bold text-lg">R$ {orcamento.recortes.toFixed(2)}</span>
          </div>
          {orcamento.detalhesRecortes.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700 pl-4 py-1 border-b border-gray-100">
              <div>
                <span className="font-medium">{item.tipo}</span>
                <span className="text-gray-500 ml-2">({item.quantidade}x - R$ {item.valorUnit.toFixed(2)} cada)</span>
                <div className="text-xs text-gray-500">{item.peca}</div>
              </div>
              <span>R$ {item.valor.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Total */}
      <div className="flex justify-between py-4 text-xl font-bold border-t-2 border-gray-400 bg-green-50 px-4 rounded">
        <span>VALOR TOTAL</span>
        <span className="text-green-600">R$ {orcamento.total.toFixed(2)}</span>
      </div>
    </div>
  );
};

// Função auxiliar para calcular orçamento com detalhes
const calcularOrcamentoComDetalhes = (orcamentoAtual, materiais) => {
  if (!orcamentoAtual) return { 
    subtotal: 0, 
    acabamentos: 0, 
    recortes: 0, 
    total: 0, 
    chapasPorMaterial: {},
    detalhesAcabamentos: [],
    detalhesRecortes: []
  };

  let totalChapas = 0;
  const chapasPorMaterial = {};

  // Contar chapas por material
  orcamentoAtual.chapas.forEach(chapa => {
    const key = chapa.materialId;
    chapasPorMaterial[key] = (chapasPorMaterial[key] || 0) + 1;
  });

  // Calcular custo das chapas
  Object.keys(chapasPorMaterial).forEach(materialId => {
    const material = materiais.find(m => m.id === parseInt(materialId));
    if (material) {
      totalChapas += material.custo * chapasPorMaterial[materialId];
    }
  });

  let totalAcabamentos = 0;
  let totalRecortes = 0;
  const detalhesAcabamentos = [];
  const detalhesRecortes = [];

  orcamentoAtual.ambientes.forEach((ambiente, ambIdx) => {
    ambiente.pecas.forEach((peca, pecaIdx) => {
      const nomePeca = `${ambiente.nome} - Peça #${pecaIdx + 1}`;
      
      // Acabamentos
      if (peca.esquadria && peca.esquadria > 0) {
        const valor = (peca.esquadria / 1000) * 35;
        totalAcabamentos += valor;
        detalhesAcabamentos.push({
          tipo: 'Esquadria',
          peca: nomePeca,
          medida: `${peca.esquadria}mm`,
          valor
        });
      }
      
      if (peca.boleado && peca.boleado > 0) {
        const valor = (peca.boleado / 1000) * 15;
        totalAcabamentos += valor;
        detalhesAcabamentos.push({
          tipo: 'Boleado/Canal',
          peca: nomePeca,
          medida: `${peca.boleado}mm`,
          valor
        });
      }
      
      if (peca.polimento && peca.polimento > 0) {
        const valor = (peca.polimento / 1000) * 22;
        totalAcabamentos += valor;
        detalhesAcabamentos.push({
          tipo: 'Polimento',
          peca: nomePeca,
          medida: `${peca.polimento}mm`,
          valor
        });
      }
      
      // Recortes
      if (peca.cuba && peca.cuba > 0) {
        const valor = peca.cuba * 100;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Cuba',
          peca: nomePeca,
          quantidade: peca.cuba,
          valorUnit: 100,
          valor
        });
      }
      
      if (peca.cubaEsculpida && peca.cubaEsculpida > 0) {
        const valor = peca.cubaEsculpida * 630;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Cuba Esculpida',
          peca: nomePeca,
          quantidade: peca.cubaEsculpida,
          valorUnit: 630,
          valor
        });
      }
      
      if (peca.cooktop && peca.cooktop > 0) {
        const valor = peca.cooktop * 150;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Cooktop',
          peca: nomePeca,
          quantidade: peca.cooktop,
          valorUnit: 150,
          valor
        });
      }
      
      if (peca.recorte && peca.recorte > 0) {
        const valor = peca.recorte * 60;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Recorte',
          peca: nomePeca,
          quantidade: peca.recorte,
          valorUnit: 60,
          valor
        });
      }
      
      if (peca.pes && peca.pes > 0) {
        const valor = peca.pes * 200;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Pés',
          peca: nomePeca,
          quantidade: peca.pes,
          valorUnit: 200,
          valor
        });
      }
    });
  });

  return {
    subtotal: totalChapas,
    acabamentos: totalAcabamentos,
    recortes: totalRecortes,
    total: totalChapas + totalAcabamentos + totalRecortes,
    chapasPorMaterial,
    detalhesAcabamentos,
    detalhesRecortes
  };
};

// Componente de Plano de Corte da Chapa
const PlanoCorteChapa = ({ chapa, numero, onMoverPeca, onGirarPeca, pecaArrastando, setPecaArrastando }) => {
  const [escala, setEscala] = useState(0.15);
  const canvasRef = useRef(null);
  const [arrastandoPeca, setArrastandoPeca] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pecaSelecionada, setPecaSelecionada] = useState(null);

  useEffect(() => {
    desenharChapa();
  }, [chapa, escala, arrastandoPeca, pecaSelecionada]);

  const desenharChapa = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const largura = chapa.material.comprimento * escala;
    const altura = chapa.material.altura * escala;

    canvas.width = largura + 100;
    canvas.height = altura + 100;

    // Fundo da chapa
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(50, 50, largura, altura);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, largura, altura);

    // Desenhar grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= chapa.material.comprimento; i += 500) {
      const x = 50 + i * escala;
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, 50 + altura);
      ctx.stroke();
    }
    for (let i = 0; i <= chapa.material.altura; i += 500) {
      const y = 50 + i * escala;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(50 + largura, y);
      ctx.stroke();
    }

    // Desenhar peças
    chapa.pecas.forEach((peca, idx) => {
      if (arrastandoPeca?.id === peca.id) return;

      const x = 50 + peca.posX * escala;
      const y = 50 + peca.posY * escala;
      
      // Considerar rotação para dimensões
      const w = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
      const h = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;

      // Área de espaçamento (4mm ao redor)
      const espacamento = 4 * escala;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x - espacamento, y - espacamento, w + espacamento * 2, h + espacamento * 2);
      ctx.setLineDash([]);

      // Peça - destacar se selecionada
      const ehSelecionada = pecaSelecionada === peca.id;
      ctx.fillStyle = ehSelecionada ? '#10b981' : '#3b82f6';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = ehSelecionada ? '#059669' : '#1e40af';
      ctx.lineWidth = ehSelecionada ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      // Texto com dimensões (considerando rotação)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      const dimensoes = peca.rotacao === 90 
        ? `${peca.altura}x${peca.comprimento}` 
        : `${peca.comprimento}x${peca.altura}`;
      ctx.fillText(dimensoes, x + w/2, y + h/2 - 5);
      
      // Número da peça
      ctx.font = '9px Arial';
      ctx.fillText(`#${idx + 1}`, x + w/2, y + h/2 + 7);
      
      // Indicador de rotação
      if (peca.rotacao === 90) {
        ctx.font = 'bold 8px Arial';
        ctx.fillText('↻ 90°', x + w/2, y + h/2 + 16);
      }
    });

    // Desenhar peça sendo arrastada
    if (arrastandoPeca) {
      const w = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento) * escala;
      const h = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura) * escala;
      
      // Cor muda para vermelho se houver colisão
      const cor = arrastandoPeca.colisao ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.6)';
      const corBorda = arrastandoPeca.colisao ? '#dc2626' : '#1e40af';
      
      ctx.fillStyle = cor;
      ctx.fillRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.strokeStyle = corBorda;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.setLineDash([]);
      
      // Texto de aviso
      if (arrastandoPeca.colisao) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('COLISÃO!', arrastandoPeca.x + w/2, arrastandoPeca.y + h/2);
      }
    }

    // Dimensões
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${chapa.material.comprimento} mm`, 50 + largura/2, 35);
    ctx.save();
    ctx.translate(35, 50 + altura/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`${chapa.material.altura} mm`, 0, 0);
    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Verificar se clicou em alguma peça
    const pecaClicada = chapa.pecas.find(peca => {
      const px = 50 + peca.posX * escala;
      const py = 50 + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
      const ph = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });

    if (pecaClicada) {
      setPecaSelecionada(pecaClicada.id);
      const px = 50 + pecaClicada.posX * escala;
      const py = 50 + pecaClicada.posY * escala;
      setOffset({ x: x - px, y: y - py });
      setArrastandoPeca({ ...pecaClicada, x: px, y: py });
    } else {
      setPecaSelecionada(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!arrastandoPeca) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;
    
    // Converter para coordenadas da chapa
    let novaX = Math.max(0, Math.round((x - 50) / escala));
    let novaY = Math.max(0, Math.round((y - 50) / escala));
    const espacamento = 4;
    
    // MAGNETISMO - Detectar proximidade com outras peças
    const toleranciaMagnetismo = 20; // pixels de tolerância para ativar o magnetismo
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura;
    
    chapa.pecas.forEach(p => {
      if (p.id === arrastandoPeca.id) return;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
      
      // Magnetismo horizontal (alinhamento à direita da peça existente)
      const distDireita = Math.abs(novaX - (p.posX + larguraOutra + espacamento));
      if (distDireita < toleranciaMagnetismo && 
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = p.posX + larguraOutra + espacamento;
      }
      
      // Magnetismo horizontal (alinhamento à esquerda da peça existente)
      const distEsquerda = Math.abs((novaX + larguraPeca + espacamento) - p.posX);
      if (distEsquerda < toleranciaMagnetismo && 
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = p.posX - larguraPeca - espacamento;
      }
      
      // Magnetismo vertical (alinhamento abaixo da peça existente)
      const distBaixo = Math.abs(novaY - (p.posY + alturaOutra + espacamento));
      if (distBaixo < toleranciaMagnetismo && 
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = p.posY + alturaOutra + espacamento;
      }
      
      // Magnetismo vertical (alinhamento acima da peça existente)
      const distCima = Math.abs((novaY + alturaPeca + espacamento) - p.posY);
      if (distCima < toleranciaMagnetismo && 
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = p.posY - alturaPeca - espacamento;
      }
      
      // Alinhamento de bordas (mesmo Y)
      if (Math.abs(novaY - p.posY) < toleranciaMagnetismo) {
        novaY = p.posY;
      }
      
      // Alinhamento de bordas (mesmo X)
      if (Math.abs(novaX - p.posX) < toleranciaMagnetismo) {
        novaX = p.posX;
      }
    });
    
    // Verificar se a nova posição causaria colisão
    const temColisao = chapa.pecas.some(p => {
      if (p.id === arrastandoPeca.id) return false;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
      
      const centroNovaX = novaX + larguraPeca / 2;
      const centroNovaY = novaY + alturaPeca / 2;
      const centroPecaX = p.posX + larguraOutra / 2;
      const centroPecaY = p.posY + alturaOutra / 2;
      
      const distanciaX = Math.abs(centroNovaX - centroPecaX);
      const distanciaY = Math.abs(centroNovaY - centroPecaY);
      
      const distanciaMinX = (larguraPeca + larguraOutra) / 2 + espacamento;
      const distanciaMinY = (alturaPeca + alturaOutra) / 2 + espacamento;
      
      return distanciaX < distanciaMinX && distanciaY < distanciaMinY;
    });
    
    const foraDosLimites = 
      novaX + larguraPeca + espacamento > chapa.material.comprimento ||
      novaY + alturaPeca + espacamento > chapa.material.altura ||
      novaX < espacamento ||
      novaY < espacamento;
    
    setArrastandoPeca({ 
      ...arrastandoPeca, 
      x: 50 + novaX * escala, 
      y: 50 + novaY * escala,
      posXReal: novaX,
      posYReal: novaY,
      colisao: temColisao || foraDosLimites
    });
  };

  const handleMouseUp = (e) => {
    if (!arrastandoPeca) return;

    // Usar as coordenadas já calculadas pelo magnetismo
    const novaX = arrastandoPeca.posXReal !== undefined ? arrastandoPeca.posXReal : Math.max(0, Math.round((arrastandoPeca.x - 50) / escala));
    const novaY = arrastandoPeca.posYReal !== undefined ? arrastandoPeca.posYReal : Math.max(0, Math.round((arrastandoPeca.y - 50) / escala));

    const espacamento = 4;
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura;

    // Verificar se está dentro dos limites da chapa
    const dentroDosLimites = 
      novaX + larguraPeca + espacamento <= chapa.material.comprimento &&
      novaY + alturaPeca + espacamento <= chapa.material.altura &&
      novaX >= espacamento &&
      novaY >= espacamento;

    if (!dentroDosLimites) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastandoPeca(null);
      return;
    }

    // Verificar colisão com outras peças (respeitando 4mm de espaçamento)
    const temColisao = chapa.pecas.some(p => {
      if (p.id === arrastandoPeca.id) return false;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
      
      // Calcular distâncias entre centros
      const centroNovaX = novaX + larguraPeca / 2;
      const centroNovaY = novaY + alturaPeca / 2;
      const centroPecaX = p.posX + larguraOutra / 2;
      const centroPecaY = p.posY + alturaOutra / 2;
      
      const distanciaX = Math.abs(centroNovaX - centroPecaX);
      const distanciaY = Math.abs(centroNovaY - centroPecaY);
      
      // Distância mínima necessária (metade de cada peça + espaçamento de 4mm)
      const distanciaMinX = (larguraPeca + larguraOutra) / 2 + espacamento;
      const distanciaMinY = (alturaPeca + alturaOutra) / 2 + espacamento;
      
      // Há colisão se ambas as distâncias forem menores que o mínimo
      return distanciaX < distanciaMinX && distanciaY < distanciaMinY;
    });

    if (temColisao) {
      alert('Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos 4mm de distância das outras peças.');
      setArrastandoPeca(null);
      return;
    }

    // Posição válida - mover a peça
    onMoverPeca(arrastandoPeca.id, chapa.id, novaX, novaY);
    setArrastandoPeca(null);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Chapa #{numero}</h3>
          <p className="text-sm text-gray-600">{chapa.material.nome} - {chapa.pecas.length} peças</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Zoom:</label>
          <input
            type="range"
            min="0.05"
            max="0.3"
            step="0.01"
            value={escala}
            onChange={(e) => setEscala(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
      </div>
      <div className="overflow-auto bg-white border border-gray-300 rounded">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move"
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-500">
          Clique e arraste as peças para reposicioná-las. Magnetismo automático ativado (20mm de tolerância).
        </p>
        {pecaSelecionada && (
          <button
            onClick={() => {
              onGirarPeca(pecaSelecionada, chapa.id);
            }}
            className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
          >
            <span className="rotate-90 inline-block">↻</span>
            Girar Peça (90°)
          </button>
        )}
      </div>
    </div>
  );
};

export default SistemaOrcamentoMarmore;
