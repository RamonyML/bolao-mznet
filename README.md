# ⚽ Bolão MZ NET — Copa do Mundo 2026

> Aplicação de bolão interno desenvolvida do zero para os funcionários da **MZ NET** durante a Copa do Mundo 2026. Ranking em tempo real, sistema anti-fraude, álbum de figurinhas e painel administrativo — tudo com JavaScript puro, sem framework, sem etapa de build.

<p>
  <a href="https://ramonyml.github.io/bolao-mznet/" target="_blank">
    <img src="https://img.shields.io/badge/🔗%20Demo%20ao%20vivo-ramonyml.github.io%2Fbolao--mznet-4CAF50?style=flat-square" alt="Demo ao vivo" />
  </a>
  <img src="https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Firebase-Firestore%20+%20Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Bootstrap-5-7952B3?style=flat-square&logo=bootstrap&logoColor=white" />
  <img src="https://img.shields.io/badge/Hospedagem-GitHub%20Pages-181717?style=flat-square&logo=github&logoColor=white" />
</p>

---

## Funcionalidades

### Site público (`index.html`)
- **Registro de palpites** com nome, setor, jogo/fase e placar
- **Autocomplete de nome** a partir de 2 caracteres, com preenchimento automático do setor
- **Limite de 1 palpite por jogo** — envio bloqueado com mensagem amigável se o participante já registrou para aquele jogo
- **Ranking ao vivo** com pódio animado (top 3) e confetti para o líder; alterna entre modo pódio e tabela de pontos corridos
- **Pontuação**: 5 pts para placar exato · 2 pts para acerto do resultado · desempate por registro mais antigo
- **Anti-fraude**:
  - Palpites registrados após o resultado oficial são exibidos com alerta ⚠ e excluídos do ranking
  - Duplicatas (mesmo nome + jogo) exibidas com badge laranja — apenas o primeiro registro conta
- **Filtros na lista de palpites**: tabs Em aberto / Encerrados / Exatos ⭐, filtro por jogo e busca por nome
- **Reações com emoji** (🔥 😂 👏 🐔 🍿) por palpite
- **Figurinha compartilhável**: card gerado com `html2canvas` contendo foto + estatísticas do participante
- **Pacotinho da sorte**: revela uma figurinha aleatória do time

### Álbum (`album.html`)
- Galeria de figurinhas do elenco, modo grade e individual (desktop), modal de ampliação

### Área administrativa (`admin.html`)
- Login via Firebase Authentication
- Lançamento e edição de resultados oficiais
- Gerenciamento de palpites (editar / apagar)
- Prévia do ranking
- **Painel de features**: liga/desliga em tempo real o pacotinho, as reações e o confetti
- Botão para zerar todas as reações

### Ranking por setor *(engavetado — aguardando aprovação)*
- Ranking coletivo por área da empresa, usando **média de pontos por membro** para equilibrar setores de tamanhos diferentes
- Para ativar: remover a classe `d-none` do `<section id="setor-ranking-section">` em `index.html`

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | JavaScript ES Modules (sem build, sem framework) |
| UI | Bootstrap 5 |
| Banco de dados | Firebase Firestore |
| Autenticação | Firebase Authentication |
| Hospedagem | GitHub Pages |
| Geração de imagem | html2canvas |
| Animação | canvas-confetti |

---

## Arquitetura

13 módulos ES com responsabilidades bem definidas, carregados nativamente pelo browser:

```
.
├── index.html              # Site público (palpites + ranking)
├── album.html              # Álbum de figurinhas
├── admin.html              # Área administrativa
├── css/                    # Estilos separados por página (styles, album, admin)
├── js/
│   ├── app.js              # Lógica do site público
│   ├── admin.js            # Lógica do painel admin
│   ├── album.js            # Lógica do álbum
│   ├── bolao-scoring.js    # Pontuação, ranking individual e por setor
│   ├── card-palpiteiro.js  # Card compartilhável via html2canvas
│   ├── pacotinho.js        # Pacotinho da sorte
│   ├── nome-autocomplete.js# Autocomplete com preenchimento de setor
│   ├── figurinhas-data.js  # Dados do elenco de figurinhas
│   ├── usuarios.js         # Lista de participantes por setor
│   ├── setores.js          # Setores disponíveis
│   ├── jogos-select.js     # Opções de jogos/fases
│   ├── team-flags.js       # Bandeiras dos times
│   └── firebase-config.js  # Configuração do Firebase
├── figures/                # Figurinhas em PNG + thumbs em WebP
├── backgrounds/            # Imagens de fundo
├── logo/                   # Logos MZ NET
├── firebase.json           # Configuração do Firestore
└── firestore.rules         # Regras de segurança granulares
```

---

## Modelo de dados (Firestore)

| Coleção | Leitura | Escrita |
|---------|---------|---------|
| `palpites` | Pública | Pública (criação); somente o campo `reactions` é atualizável anonimamente; edição/exclusão somente admin |
| `resultados` | Pública | Somente admin |
| `config/features` | Pública | Somente admin |
| `config/jogos` | Pública | Somente admin |

---

## Rodando localmente

Por usar ES Modules, os arquivos devem ser servidos via HTTP — abrir o `index.html` direto no navegador não funciona.

```bash
# Python (já instalado na maioria dos sistemas)
python -m http.server 8000

# Node.js
npx serve .
```

Acesse `http://localhost:8000`.

---

## Deploy

Hospedado no **GitHub Pages** a partir da branch `main`. Cada push atualiza automaticamente:

```bash
git add .
git commit -m "descrição"
git push origin main
```

---

Desenvolvido por [Ramony Menezes Lima](https://github.com/RamonyML) · MZ NET · 2026
