import type { CategoryRule } from '../types/finance';

export const expenseRules: CategoryRule[] = [
  { category: 'Mercado', keywords: ['mercado', 'supermercado', 'atacadao', 'atacadão', 'assai', 'assaí', 'condor', 'muffato', 'carrefour'] },
  { category: 'Alimentação', keywords: ['ifood', 'restaurante', 'lanchonete', 'pizza', 'burger', 'padaria', 'cafe', 'café'] },
  { category: 'Transporte', keywords: ['uber', '99', 'posto', 'combustivel', 'combustível', 'gasolina', 'alcool', 'álcool', 'etanol', 'estacionamento', 'pedagio', 'pedágio'] },
  { category: 'Moradia', keywords: ['aluguel', 'condominio', 'condomínio', 'energia', 'copel', 'agua', 'água', 'sanepar', 'internet', 'vivo', 'claro', 'tim'] },
  { category: 'Saúde', keywords: ['farmacia', 'farmácia', 'drogaria', 'consulta', 'medico', 'médico', 'laboratorio', 'laboratório', 'exame'] },
  { category: 'Lazer', keywords: ['cinema', 'netflix', 'spotify', 'prime', 'show', 'ingresso', 'bar'] },
  { category: 'Educação', keywords: ['faculdade', 'curso', 'livro', 'universidade', 'uel'] },
  { category: 'Compras', keywords: ['amazon', 'mercado livre', 'magazine', 'shein', 'shopee', 'loja'] },
  { category: 'Taxas bancárias', keywords: ['tarifa', 'juros', 'iof', 'anuidade', 'cesta'] },
];

export const incomeRules: CategoryRule[] = [
  { category: 'Salário', keywords: ['salario', 'salário', 'pagamento empresa', 'folha'] },
  { category: 'Pix recebido', keywords: ['pix recebido', 'receb pix', 'transferencia recebida', 'transferência recebida'] },
  { category: 'Reembolso', keywords: ['reembolso', 'estorno', 'devolucao', 'devolução'] },
  { category: 'Rendimentos', keywords: ['rendimento', 'juros capital', 'investimento'] },
];

export const sampleText = `01/05/2026;PIX RECEBIDO CLIENTE;2500,00
02/05/2026;MERCADO MUFFATO;-286,43
03/05/2026;UBER VIAGEM;-32,90
05/05/2026;IFOOD RESTAURANTE;-48,70
07/05/2026;POSTO COMBUSTIVEL;-180,00
10/05/2026;NETFLIX;-39,90
12/05/2026;FARMACIA DROGARIA;-67,35
15/05/2026;SALARIO EMPRESA;3200,00
16/05/2026;ALUGUEL;-950,00
18/05/2026;AMAZON COMPRA;-129,90`;
