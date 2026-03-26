export const DEFAULT_CATEGORIES = [
  {
    name: 'Alimentação',
    subcategories: ['Supermercado', 'Restaurante', 'Lanches', 'Padaria', 'Outros']
  },
  {
    name: 'Moradia',
    subcategories: ['Aluguel', 'Condomínio', 'Energia', 'Água', 'Internet', 'Manutenção', 'IPTU', 'Outros']
  },
  {
    name: 'Transporte',
    subcategories: ['Combustível', 'Uber/99', 'Ônibus/Metrô', 'Estacionamento', 'Manutenção Veículo', 'Seguro', 'IPVA', 'Outros']
  },
  {
    name: 'Saúde',
    subcategories: ['Plano de Saúde', 'Farmácia', 'Dentista', 'Exames', 'Outros']
  },
  {
    name: 'Educação',
    subcategories: ['Mensalidade', 'Cursos', 'Livros', 'Outros']
  },
  {
    name: 'Lazer',
    subcategories: ['Viagem', 'Cinema', 'Shows', 'Hobby', 'Outros']
  },
  {
    name: 'Assinaturas',
    subcategories: ['Netflix', 'Spotify', 'Amazon Prime', 'Academia', 'Outros']
  },
  {
    name: 'Vestuário',
    subcategories: ['Roupas', 'Calçados', 'Acessórios', 'Outros']
  },
  {
    name: 'Cuidados Pessoais',
    subcategories: ['Cabelo', 'Barba', 'Cosméticos', 'Outros']
  },
  {
    name: 'Dívidas',
    subcategories: ['Empréstimo', 'Financiamento', 'Outros']
  },
  {
    name: 'Receita',
    subcategories: ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros']
  }
];

export const ACCOUNT_TYPES = [
  { id: 'credit', name: 'Cartão de Crédito' },
  { id: 'debit', name: 'Cartão de Débito' },
  { id: 'cash', name: 'Dinheiro' }
];

export const TRANSACTION_TYPES = [
  { id: 'expense', name: 'Despesa' },
  { id: 'income', name: 'Receita' },
  { id: 'transfer', name: 'Transferência' }
];

export const DEFAULT_PAYMENT_METHODS = [
  { name: 'Cartão de Crédito', icon: 'CreditCard' },
  { name: 'Cartão de Débito', icon: 'Wallet' },
  { name: 'Dinheiro', icon: 'Banknote' },
  { name: 'Pix', icon: 'RefreshCw' },
  { name: 'Boleto', icon: 'History' },
  { name: 'Transferência', icon: 'RefreshCw' }
];
