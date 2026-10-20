// Contrato de paginação dos repositories: neutro de HTTP e de ORM. O adapter traduz
// para skip/take; a presentation devolve junto com page/limit.
export interface PageRequest {
  page: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}
