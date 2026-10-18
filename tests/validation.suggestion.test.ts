import { describe, expect, it } from 'vitest';
import { sanitizeSuggestionField, validateSuggestion } from '../src/services/validation';
import type { SuggestionInput } from '../src/types';

const valid: SuggestionInput = {
  name: 'Ecoponto Centro',
  address: 'Avenida Amazonas',
  number: '123',
  district: 'Santa Efigênia',
  zipCode: '30140071',
  city: 'Belo Horizonte',
  state: 'MG',
  acceptedWasteIds: ['pilha'],
  openingHours: '08:00 - 18:00',
  phone: '',
  observation: 'Entrada pela portaria 2. Coleta das 8h às 17h.',
};

describe('validação específica de novas sugestões', () => {
  it.each(['', '3133334444', '31999998888'])('aceita telefone opcional ou com DDD: %s', (phone) => {
    expect(() => validateSuggestion({ ...valid, phone })).not.toThrow();
  });

  it.each(['Ecoponto Centro', 'Cooperativa Esperança', 'Mercado Verde', 'Associação Reciclar'])(
    'aceita nome %s',
    (name) => {
      expect(() => validateSuggestion({ ...valid, name })).not.toThrow();
    },
  );

  const invalid: [keyof SuggestionInput, string, string][] = [
    ['name', 'Ecoponto 123', 'Use apenas letras no nome do local.'],
    ['name', 'Ecoponto@', 'Use apenas letras no nome do local.'],
    ['name', '   ', 'Use apenas letras no nome do local.'],
    ['address', 'Avenida Amazonas 123', 'Use apenas letras no endereço.'],
    ['address', 'Rua @ Flores', 'Use apenas letras no endereço.'],
    ['address', '  ', 'Use apenas letras no endereço.'],
    ['district', 'Santa Efigênia 2', 'Use apenas letras no bairro.'],
    ['district', 'Centro@', 'Use apenas letras no bairro.'],
    ['district', ' ', 'Use apenas letras no bairro.'],
    ['city', 'Belo Horizonte 123', 'Use apenas letras no nome da cidade.'],
    ['city', 'BH123', 'Use apenas letras no nome da cidade.'],
    ['city', '12345', 'Use apenas letras no nome da cidade.'],
    ['city', ' ', 'Use apenas letras no nome da cidade.'],
    ['number', '123A', 'Informe apenas números.'],
    ['number', '12-3', 'Informe apenas números.'],
    ['number', '+123', 'Informe apenas números.'],
    ['number', '123,5', 'Informe apenas números.'],
    ['number', '123.5', 'Informe apenas números.'],
    ['number', '12 3', 'Informe apenas números.'],
    ['number', '1234567', 'Informe apenas números.'],
    ['number', '', 'Informe apenas números.'],
    ['zipCode', '3014007', 'Informe um CEP com 8 números.'],
    ['zipCode', '301400711', 'Informe um CEP com 8 números.'],
    ['zipCode', '3014a071', 'Informe um CEP com 8 números.'],
    ['zipCode', '30140-071', 'Informe um CEP com 8 números.'],
    ['phone', '3199999888a', 'Informe um telefone com DDD e 10 ou 11 números.'],
    ['phone', '319999999', 'Informe um telefone com DDD e 10 ou 11 números.'],
    ['phone', '5531999998888', 'Informe um telefone com DDD e 10 ou 11 números.'],
    ['phone', '(31) 3333-4444', 'Informe um telefone com DDD e 10 ou 11 números.'],
    ['openingHours', '', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', ' - 18:00', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', '08:00 - ', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', '08:00 - 08:00', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', '18:00 - 08:00', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', '08:15 - 18:00', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', '08:00 - 24:00', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', '1312afawfga', 'Selecione um horário de funcionamento válido.'],
    ['openingHours', '08:00 - 18:00 - 19:00', 'Selecione um horário de funcionamento válido.'],
  ];
  it.each(invalid)('impede envio com %s = %s', (key, value, message) => {
    expect(() => validateSuggestion({ ...valid, [key]: value })).toThrow(message);
  });

  it('preserva a exigência de materiais e estado', () => {
    expect(() => validateSuggestion({ ...valid, acceptedWasteIds: [] })).toThrow(
      'Selecione pelo menos um material.',
    );
    expect(() => validateSuggestion({ ...valid, state: '' })).toThrow('Informe a sigla do estado.');
  });

  it('aceita os limites do número e dos horários no mesmo dia', () => {
    expect(() =>
      validateSuggestion({ ...valid, number: '123456', openingHours: '00:00 - 23:30' }),
    ).not.toThrow();
  });
});

describe('entrada e colagem no formulário de sugestão', () => {
  it.each(['name', 'address', 'district', 'city'] as const)(
    'remove números e símbolos de %s sem perder acentos',
    (key) => {
      expect(sanitizeSuggestionField(key, 'São123  José@ das Flores!')).toBe('São José das Flores');
      expect(sanitizeSuggestionField(key, 'A\u0301rvore ÇÂÃÉÊÍÓÔÕÚ áàâãéêíóôõúç')).toBe(
        'Árvore ÇÂÃÉÊÍÓÔÕÚ áàâãéêíóôõúç',
      );
    },
  );

  it.each([
    ['number', '123A', '123'],
    ['number', ' +12-3.456,789', '123456'],
    ['zipCode', '30abc140-071', '30140071'],
    ['zipCode', '30140071111', '30140071'],
    ['phone', '31abc99999-8888', '31999998888'],
    ['phone', '(31) 3333-4444', '3133334444'],
    ['phone', '31999998888000', '31999998888'],
  ] as const)('mantém apenas os dígitos dentro do limite em %s', (key, input, expected) => {
    expect(sanitizeSuggestionField(key, input)).toBe(expected);
  });

  it('não modifica estado nem o conteúdo livre das observações', () => {
    expect(sanitizeSuggestionField('state', 'MG')).toBe('MG');
    expect(sanitizeSuggestionField('observation', valid.observation)).toBe(valid.observation);
  });
});
