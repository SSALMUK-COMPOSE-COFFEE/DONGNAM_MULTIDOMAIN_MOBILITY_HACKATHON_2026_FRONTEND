export type IntakeFieldErrorT = { field: string; message: string };

export type IntakeOptionT = { id: string; label: string };

export type IntakeFormOptionsT = {
  products: IntakeOptionT[];
  shippers: IntakeOptionT[];
  destinations: IntakeOptionT[];
};
