import { describe, it } from 'node:test';
import { strictEqual, throws } from 'node:assert';
import { coursePositionSchema, needsPositionReview, positionLevel } from './course-position';

describe('Contrôles de position des cours', () => {
  it('vert sous 200 m avec un GPS précis', () => {
    strictEqual(positionLevel(199, 200), 'vert');
  });
  it('orange entre 200 et 500 m inclus', () => {
    strictEqual(positionLevel(200, 10), 'orange');
    strictEqual(positionLevel(500, 10), 'orange');
  });
  it('orange si la précision dépasse 200 m', () => {
    strictEqual(positionLevel(30, 201), 'orange');
  });
  it('rouge au-delà de 500 m, même avec un GPS imprécis', () => {
    strictEqual(positionLevel(501, 300), 'rouge');
  });
  it('gris sans distance disponible', () => {
    strictEqual(positionLevel(null, 10), 'gris');
  });
  it('une confirmation parentale ne ferme jamais une alerte rouge', () => {
    strictEqual(needsPositionReview(true, null, true), true);
    strictEqual(needsPositionReview(true, null, false), true);
    strictEqual(needsPositionReview(true, '2026-11-24T09:39:00Z', true), false);
  });
  it('valide la précision GPS et rejette les coordonnées hors limites', () => {
    strictEqual(coursePositionSchema.parse({ lat: 5, lng: -4, accuracy: 25, reason: null }).accuracy, 25);
    throws(() => coursePositionSchema.parse({ lat: 91, lng: 0, accuracy: 25, reason: null }));
  });
});