/**
 * Lista de usuários do time MZNET (origem: figurinhas em /figures).
 * Agrupado por setor (ordem alfabética) e nomes em ordem alfabética.
 *
 * Mantenha sincronizado com FIGURE_FILES em js/album.js.
 */

export const USUARIOS_POR_SETOR = {
  Cadastro: ["Andressa", "Felipe", "Hael", "Marcella Eduarda"],
  Comercial: [
    "Aldecilene",
    "Ana Luiza",
    "Maria Carolina",
    "Hianca",
    "Josilene",
    "Larissa Rodrigues",
    "Luiz Henrique",
    "Raiane",
    "Thauanny",
    "Thayane",
  ],
  Estoque: ["Elias"],
  Financeiro: [
    "Bruna Stefani",
    "Daniela",
    "Joicy",
    "Josy",
    "Luiz Gustavo",
    "Maria Eduarda",
    "Vitor Cosmo",
  ],
  Instalação: ["Jorge", "José Gabriel", "Leandro", "Maria Betania", "Priscila"],
  Redes: ["Murilo"],
  Suporte: [
    "Andreza Batista",
    "Bruna Cristina",
    "Eduardo Henrique",
    "Gabriel Martins",
    "Halysson Gelado",
    "Hiago Alves",
    "Hiorrana",
    "Izabela",
    "Jhonatan",
    "José Junior",
    "Karolayne",
    "Lauren Lanes",
    "Luis Filipe",
    "Pedro Bimbim",
    "Ramony Lima",
    "Renata Saraiva",
    "Ronald",
    "Vagner Junio",
    "Victor Hugo",
    "Vitor Dornelas",
    "Vitor Manoel",
  ],
  Outro: ["Dione", "Marcelo", "Zé Renato"],
  "Sem setor": ["Lili"],
};

/** Lista plana de { nome, setor }, ordenada por setor e depois por nome. */
export const USUARIOS = Object.entries(USUARIOS_POR_SETOR).flatMap(
  ([setor, nomes]) => nomes.map((nome) => ({ nome, setor }))
);
