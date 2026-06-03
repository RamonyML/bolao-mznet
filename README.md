# Bolão MZNET · Copa 2026

Aplicação web do bolão da Copa do Mundo 2026 do time **MZNET**, criada para entretenimento interno durante o período da Copa. Os participantes registram seus palpites de placar, acompanham um ranking ao vivo e conferem o álbum de figurinhas do time.

🔗 **Produção:** https://bolao-mz.web.app

## Funcionalidades

### Site público (`index.html`)
- **Registro de palpites** com nome, setor, jogo/fase e placar.
- **Autocomplete de nome** a partir de 2 caracteres (com preenchimento automático do setor).
- **Ranking ao vivo** com pódio animado (top 3) e confete para o líder.
- **Pontuação**: 5 pontos para placar exato, 2 pontos para acerto do resultado.
- **Desempate** por quem registrou primeiro.
- **Cápsula de alerta** quando um palpite é registrado depois do resultado oficial (anti-trapaça transparente).
- **Reações com emoji** (🔥 😂 👏 🐔) em cada palpite.
- **Pacotinho da sorte**: revela uma figurinha aleatória do time.
- **Figurinha do palpiteiro**: card compartilhável (imagem) com a figurinha + estatísticas.

### Álbum (`album.html`)
- Álbum de figurinhas do time com visualização em grade, modo individual (desktop) e modal de ampliação.

### Área administrativa (`admin.html`)
- Login via Firebase Authentication.
- Lançamento e edição de resultados oficiais.
- Gerenciamento (editar/apagar) de palpites.
- Prévia do ranking.
- **Painel de funcionalidades**: liga/desliga em tempo real o pacotinho, as reações e o confete.
- Botão para **zerar as reações** de todos os palpites.

## Tecnologias
- HTML, CSS e JavaScript (ES Modules), sem build step.
- [Bootstrap 5](https://getbootstrap.com/) para componentes de UI.
- [Firebase](https://firebase.google.com/) — Firestore (dados), Authentication (admin) e Hosting.
- [canvas-confetti](https://github.com/catdad/canvas-confetti) e [html2canvas](https://html2canvas.hertzen.com/) (via CDN).

## Estrutura
```
.
├── index.html              # Site público (palpites + ranking)
├── album.html              # Álbum de figurinhas
├── admin.html              # Área administrativa
├── css/                    # Estilos (styles, album, admin)
├── js/
│   ├── app.js              # Lógica do site público
│   ├── admin.js            # Lógica do admin
│   ├── album.js            # Lógica do álbum
│   ├── bolao-scoring.js    # Pontuação e ranking
│   ├── card-palpiteiro.js  # Card compartilhável
│   ├── pacotinho.js        # Pacotinho da sorte
│   ├── nome-autocomplete.js# Autocomplete de nomes
│   ├── figurinhas-data.js  # Dados das figurinhas
│   ├── usuarios.js         # Lista de usuários por setor
│   ├── setores.js          # Setores disponíveis
│   ├── jogos-select.js     # Opções de jogos/fases
│   ├── team-flags.js       # Bandeiras dos times
│   └── firebase-config.js  # Configuração do Firebase
├── figures/                # Figurinhas (PNG) e thumbs (webp)
├── backgrounds/            # Imagens de fundo
├── logo/                   # Logos MZNET
├── firebase.json           # Configuração de Hosting e Firestore
└── firestore.rules         # Regras de segurança do Firestore
```

## Rodando localmente
Por usar ES Modules, é necessário servir os arquivos via HTTP (abrir o `index.html` direto no navegador não funciona).

```bash
# Na raiz do projeto
python -m http.server 8000
```

Acesse `http://localhost:8000/`.

## Deploy
O deploy é feito no Firebase Hosting:

```bash
firebase deploy
```

## Modelo de dados (Firestore)
- **`palpites`** — leitura pública; criação pública; atualização pública apenas do campo `reactions`; edição/exclusão somente para admin.
- **`resultados`** — leitura pública; escrita somente para admin.
- **`config/features`** — flags das funcionalidades; leitura pública, escrita somente para admin.

---

Desenvolvido por Ramony Lima · MZNET 2026
