import type { CategoryRule } from '../types/finance';

export const expenseRules: CategoryRule[] = [
  {
    category: 'Alimentação',
    keywords: [
      'ifood',
      'nupay ifood',
      'restaurante',
      'lanchonete',
      'lanche',
      'pizza',
      'burger',
      'padaria',
      'cafe',
      'café',
      'cantina',
      'jasmin cantina',
      'estacao gourmet',
      'estação gourmet',
      'gente boa lanchonete',
      'restaurante hig',
      'tashiro',
      'espets',
      "espetu's",
      'pastel',
      'japi foods',
      'cascais sorvetes',
      'rei do lanche',
      'reidolanche',
      'padariamarana',
    ],
  },
  {
    category: 'Transporte',
    keywords: [
      'uber',
      '99',
      'easyjet',
      'jetshr',
      'posto',
      'auto posto',
      'petrolandia',
      'combustivel',
      'combustível',
      'gasolina',
      'alcool',
      'álcool',
      'etanol',
      'estacionamento',
      'pedagio',
      'pedágio',
      'aeroporto',
    ],
  },
  {
    category: 'Farmácia e saúde',
    keywords: ['farmacia', 'farmácia', 'drogaria', 'consulta', 'medico', 'médico', 'laboratorio', 'laboratório', 'exame'],
  },
  {
    category: 'Conveniência e pequenos gastos',
    keywords: ['conveniencia', 'conveniência', 'berlim conveniencia', 'angelim loja de conv', 'reidaconvenie', 'jequitiba comercio', 'daiso'],
  },
  {
    category: 'Mercado',
    keywords: ['mercado', 'supermercado', 'atacadao', 'atacadão', 'assai', 'assaí', 'condor', 'muffato', 'carrefour'],
  },
  {
    category: 'Moradia e contas',
    keywords: ['aluguel', 'condominio', 'condomínio', 'energia', 'copel', 'agua', 'água', 'sanepar', 'internet', 'vivo', 'claro', 'tim'],
  },
  {
    category: 'Fatura e cartão',
    keywords: ['pagamento de fatura', 'fatura', 'cartao', 'cartão'],
  },
  {
    category: 'Impostos e taxas',
    keywords: ['governo do parana', 'governo do paraná', 'secretaria de estado da fazenda', 'ipva', 'detran', 'imposto', 'taxa'],
  },
  {
    category: 'Transferências para pessoas',
    keywords: ['transferencia enviada pelo pix', 'transferência enviada pelo pix', 'pix enviado'],
  },
  {
    category: 'Compras pessoais',
    keywords: ['amazon', 'mercado livre', 'magazine', 'shein', 'shopee', 'loja', 'lashebrows', 'mp *leilamohr', 'mp *percilia'],
  },
  {
    category: 'Assinaturas e digital',
    keywords: ['netflix', 'spotify', 'prime', 'bytedance', 'tiktok', 'google', 'apple.com', 'icloud'],
  },
  {
    category: 'Lazer',
    keywords: ['cinema', 'show', 'ingresso', 'bar'],
  },
  {
    category: 'Educação',
    keywords: ['faculdade', 'curso', 'livro', 'universidade', 'uel'],
  },
  {
    category: 'Taxas bancárias',
    keywords: ['tarifa', 'juros', 'iof', 'anuidade', 'cesta'],
  },
];

export const incomeRules: CategoryRule[] = [
  { category: 'Salário e trabalho', keywords: ['salario', 'salário', 'pagamento empresa', 'folha', 'mib negocios imobiliarios', 'mib negócios imobiliários'] },
  { category: 'Transferências recebidas', keywords: ['pix recebido', 'receb pix', 'transferencia recebida', 'transferência recebida', 'transferência recebida pelo pix'] },
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
