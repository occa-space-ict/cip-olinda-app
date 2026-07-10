// Estado em memória + camada de persistência plugável.
// Substitui o acesso direto ao localStorage da referência: um adapter (localStorage
// na Fase 0, Supabase na Fase 2) implementa { load(), saveDoc(DB), saveNode(n), saveLink(L)... }.
import { byIdIn, kidsIn, rootEixo as rootEixoIn, drivePath as drivePathIn, descRamos as descRamosIn } from './model.js';

// Estado mutável compartilhado (equivalente aos globais da referência).
export const state = {
  DB: { v: 4, nodes: [], links: [] },
  sel: null,
  view: 'map',
  fstatus: new Set(),
  fprec: 0,
  fclasse: 'all',
  fsearch: '',
  showConn: true,
  flayers: 1,
  vb: { x: -820, y: -650, w: 1640, h: 1300 },
};

// Registro de ações de UI, preenchido por main.js/panel.js (quebra ciclos de import).
export const ui = {
  renderAll: () => {},
  select: () => {},
  openPanel: () => {},
  toast: () => {},
};

// Adapter de persistência. Default é um no-op; main.js injeta o real.
let persistence = {
  load: async () => state.DB,
  saveDoc: async () => {},
  saveNode: async () => {},
  saveLink: async () => {},
  deleteNodes: async () => {},
  deleteLink: async () => {},
};
export function setPersistence(p) { persistence = p; }
export const getPersistence = () => persistence;

// save() genérico — grava o documento inteiro (Fase 0/local e fallback).
export function save() { return persistence.saveDoc(state.DB); }

// Persistência pontual (last-write-wins por linha na Fase 2; o adapter local
// simplesmente regrava o documento inteiro, ignorando os argumentos).
export function saveNode(n) { return persistence.saveNode(n, state.DB); }
export function saveLink(L) { return persistence.saveLink(L, state.DB); }
export function delNodes(ids) { return persistence.deleteNodes(ids, state.DB); }
export function delLink(L) { return persistence.deleteLink(L, state.DB); }

// Acessores ligados ao DB corrente.
export const byId = (id) => byIdIn(state.DB.nodes, id);
export const kids = (id) => kidsIn(state.DB.nodes, id);
export const rootEixo = (id) => rootEixoIn(state.DB.nodes, id);
export const drivePath = (n) => drivePathIn(state.DB.nodes, n);
export const descRamos = (id) => descRamosIn(state.DB.nodes, id);

export const isFiltering = () =>
  !!(state.fstatus.size || state.fprec > 0 || state.fclasse !== 'all' || state.fsearch);
