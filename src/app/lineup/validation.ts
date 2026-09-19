export type LineupBlocker = 'squad' | 'budget' | 'squad_budget';

export function lineupBlocker(rosterCount: number, budget: number): LineupBlocker | null {
  const invalidSquad = rosterCount < 6 || rosterCount > 10;
  const negativeBudget = budget < 0;
  if (invalidSquad && negativeBudget) return 'squad_budget';
  if (invalidSquad) return 'squad';
  if (negativeBudget) return 'budget';
  return null;
}

export function lineupBlockerMessage(blocker: LineupBlocker): string[] {
  const messages: string[] = [];
  if (blocker === 'squad' || blocker === 'squad_budget') {
    messages.push('La plantilla debe tener entre 6 y 10 jugadores para guardar la alineación.');
  }
  if (blocker === 'budget' || blocker === 'squad_budget') {
    messages.push('Vende jugadores hasta dejar el presupuesto en 0 € o más.');
  }
  return messages;
}
