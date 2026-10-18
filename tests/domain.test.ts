import { describe, expect, it } from 'vitest';
import { createDemoData, seedWastes } from '../src/data/seed';
import { distanceKm, routeUrl, safeWebsite, searchWastes, userStats } from '../src/utils/domain';
describe('Pesquisa e impacto', () => {
  it('encontra plurais, sinônimos, acentos e um erro de digitação', () => {
    expect(searchWastes(seedWastes, 'pilhas')[0].id).toBe('pilha');
    expect(searchWastes(seedWastes, 'bateria celular')[0].id).toBe('bateria');
    expect(searchWastes(seedWastes, 'oleo de cozinha')[0].id).toBe('oleo');
    expect(searchWastes(seedWastes, 'computdor')[0].id).toBe('computador');
    expect(searchWastes(seedWastes, 'zzzinexistente')).toEqual([]);
    expect(
      searchWastes(
        seedWastes.map((w) => ({ ...w, active: false })),
        'pilha',
      ),
    ).toEqual([]);
  });
  it.each([
    [0, 'Iniciante Sustentável'],
    [50, 'Reciclador Consciente'],
    [150, 'Guardião Verde'],
    [300, 'Defensor do Planeta'],
    [500, 'Embaixador Eco'],
  ])('calcula o nível no limite de %i pontos', (points, level) => {
    const data = createDemoData();
    data.disposals = Array.from({ length: Number(points) / 10 }, (_, i) => ({
      id: String(i),
      userId: 'alice',
      wasteId: 'pilha',
      collectionPointId: 'demo-pinheiros',
      quantity: 100,
      date: '2026-01-01',
      createdAt: '2026-01-01T12:00:00Z',
    }));
    expect(userStats(data, 'alice')).toMatchObject({ ecoPoints: points, level });
    expect(userStats(data, 'bob').ecoPoints).toBe(0);
  });
  it('estima distância em quilômetros e mantém as coordenadas somente na rota', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.195, 2);
    expect(distanceKm({ lat: -23.55, lng: -46.63 }, { lat: -23.55, lng: -46.63 })).toBe(0);
    expect(routeUrl({ lat: 1, lng: 2 }, { lat: 3, lng: 4 })).toContain(
      'destination=1,2&origin=3,4',
    );
    expect(routeUrl({ lat: 1, lng: 2 })).not.toContain('origin=');
    expect(safeWebsite('javascript:alert(1)')).toBeUndefined();
  });
});
