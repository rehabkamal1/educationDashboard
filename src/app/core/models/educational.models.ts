export interface Student {
  readonly id: number;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  creationDate?: string;
}

export interface Teacher {
  readonly id: number;
  name: string;
  email: string;
  phone: string;
  specialization: string;
}

export interface Class {
  readonly id: number;
  name: string;
  teacherId: number;
}

export interface Section {
  readonly id: number;
  name: string;
  classId: number;
  studentIds: number[];
}

export interface Lecture {
  readonly id: number;
  title: string;
  sectionId: number;
  duration: string;
}
