import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoBackend, DEMO_STORAGE_KEY } from '../src/services/demo';
import type { SuggestionInput } from '../src/types';
import { userStats } from '../src/utils/domain';

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) || null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  });
});
const suggestion: SuggestionInput = {
  name: 'Ponto comunitário',
  address: 'Rua Exemplo',
  number: '12',
  district: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01000000',
  acceptedWasteIds: ['pilha'],
  openingHours: '08:00 - 17:00',
  phone: '',
  observation: 'Indicação de teste',
};
describe('serviço de demonstração', () => {
  it('fornece pelo menos 20 resíduos e identifica todos os pontos como fictícios', async () => {
    const service = new DemoBackend(),
      data = await service.getData();
    expect(data.wastes.length).toBeGreaterThanOrEqual(20);
    expect(data.points.every((point) => point.demo)).toBe(true);
    expect(data.users).toEqual([]);
  });
  it('persiste cadastro com hash, permite login e não armazena senha em texto', async () => {
    const service = new DemoBackend();
    await service.register('Participante', 'pessoa@example.com', 'senha-forte-2026');
    const id = (await service.getUser())!.id;
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).not.toContain('senha-forte-2026');
    await service.logout();
    const next = new DemoBackend();
    await expect(next.login('pessoa@example.com', 'incorreta')).rejects.toThrow('E-mail ou senha');
    await next.login('pessoa@example.com', 'senha-forte-2026');
    expect((await next.getUser())?.id).toBe(id);
    expect((await next.getUser())?.role).toBe('user');
  });
  it('impede mutações administrativas por visitante ou usuário comum', async () => {
    const service = new DemoBackend();
    const waste = (await service.getData()).wastes[0];
    await expect(service.saveWaste(waste)).rejects.toThrow('Entre');
    await service.loginDemo('user');
    await expect(service.saveWaste(waste)).rejects.toThrow('administradores');
  });
  it('aceita apenas descartes compatíveis, inteiros e com data válida', async () => {
    const service = new DemoBackend();
    await service.loginDemo('user');
    await expect(
      service.recordDisposal({
        wasteId: 'pilha',
        collectionPointId: 'demo-centro',
        quantity: 1,
        date: '2026-01-01',
      }),
    ).rejects.toThrow('receba');
    await expect(
      service.recordDisposal({
        wasteId: 'pilha',
        collectionPointId: 'demo-pinheiros',
        quantity: 1.5,
        date: '2026-01-01',
      }),
    ).rejects.toThrow('inteira');
    await expect(
      service.recordDisposal({
        wasteId: 'pilha',
        collectionPointId: 'demo-pinheiros',
        quantity: 1,
        date: '2026-02-31',
      }),
    ).rejects.toThrow('data válida');
    await expect(
      service.recordDisposal({
        wasteId: 'pilha',
        collectionPointId: 'demo-pinheiros',
        quantity: 1,
        date: '2999-01-01',
      }),
    ).rejects.toThrow('futuro');
    await service.recordDisposal({
      wasteId: 'pilha',
      collectionPointId: 'demo-pinheiros',
      quantity: 4,
      date: '2026-01-01',
    });
    expect(userStats(await service.getData(), 'demo-user').ecoPoints).toBe(10);
  });
  it('modera uma sugestão uma única vez e concede os pontos uma única vez', async () => {
    const service = new DemoBackend();
    await service.loginDemo('user');
    await service.suggestPoint(suggestion);
    const id = (await service.getData()).suggestions[0].id;
    await service.loginDemo('admin');
    await service.moderateSuggestion(id, true, { lat: -23.55, lng: -46.63 });
    await expect(
      service.moderateSuggestion(id, true, { lat: -23.55, lng: -46.63 }),
    ).rejects.toThrow('já foi analisada');
    const data = await service.getData();
    expect(data.points.filter((p) => p.id === `suggestion_${id}`)).toHaveLength(1);
    expect(userStats(data, 'demo-user').ecoPoints).toBe(30);
  });
  it('exige motivo da rejeição e não publica sugestões pendentes', async () => {
    const service = new DemoBackend();
    await service.loginDemo('user');
    await service.suggestPoint(suggestion);
    const id = (await service.getData()).suggestions[0].id;
    expect((await service.getData()).points).not.toContainEqual(
      expect.objectContaining({ id: `suggestion_${id}` }),
    );
    await service.loginDemo('admin');
    await expect(service.moderateSuggestion(id, false)).rejects.toThrow('Motivo');
    await service.moderateSuggestion(id, false, undefined, 'O endereço precisa de confirmação.');
    expect(userStats(await service.getData(), 'demo-user').ecoPoints).toBe(0);
  });
  it('impede avaliação duplicada e recalcula a média com uma confirmação por pessoa', async () => {
    const service = new DemoBackend();
    await service.loginDemo('user');
    await service.reviewPoint({
      pointId: 'demo-centro',
      rating: 4,
      comment: 'Dados conferidos no cenário de teste.',
    });
    await expect(
      service.reviewPoint({ pointId: 'demo-centro', rating: 5, comment: '' }),
    ).rejects.toThrow('já confirmou');
    expect(userStats(await service.getData(), 'demo-user').ecoPoints).toBe(5);
    await service.loginDemo('admin');
    await service.reviewPoint({ pointId: 'demo-centro', rating: 2, comment: '' });
    const point = (await service.getData()).points.find((p) => p.id === 'demo-centro')!;
    expect(point.rating).toBe(3);
    expect(point.totalReviews).toBe(2);
  });
  it('restringe o histórico ao dono e informa a limitação de recuperação local', async () => {
    const service = new DemoBackend();
    await service.loginDemo('user');
    await service.suggestPoint(suggestion);
    await service.register('Outra pessoa', 'outra@example.com', 'senha-segura-123');
    expect((await service.getData()).suggestions).toHaveLength(0);
    await expect(service.resetPassword('outra@example.com')).rejects.toThrow(
      'não há envio de e-mail',
    );
  });
});
