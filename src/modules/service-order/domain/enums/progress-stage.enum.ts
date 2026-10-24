// Os status do enunciado, como o cliente acompanha. É uma leitura calculada da
// Ordem e das OS (ver OrderProgress), não um status gravado. REJECTED só aparece
// por OS ("orçamento recusado").
export enum ProgressStage {
  RECEIVED = 'RECEIVED',
  IN_DIAGNOSIS = 'IN_DIAGNOSIS',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  IN_EXECUTION = 'IN_EXECUTION',
  FINISHED = 'FINISHED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
}
