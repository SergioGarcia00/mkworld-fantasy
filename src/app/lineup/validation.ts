export type LineupBlocker = 'squad' | 'budget' | 'squad_budget';

export function lineupBlocker(rosterCount: number, budget: number): LineupBlocker | null {
  const overSquad = rosterCount > 10;
  const negativeBudget = budget < 0;
  if (overSquad && negativeBudget) return 'squad_budget';
  if (overSquad) return 'squad';
  if (negativeBudget) return 'budget';
  return null;
}

export function lineupBlockerMessage(blocker: LineupBlocker): string[] {
  const messages: string[] = [];
  if (blocker === 'squad' || blocker === 'squad_budget') {
    messages.push('Vende jugadores hasta quedarte con un máximo de 10 en la plantilla.');
  }
  if (blocker === 'budget' || blocker === 'squad_budget') {
    messages.push('Vende jugadores hasta dejar el presupuesto en 0 € o más.');
  }
  return messages;
}
