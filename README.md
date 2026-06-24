# Bolão MZNET · Copa 2026

Aplicação web do bolão da Copa do Mundo 2026 do time **MZNET**, criada para entretenimento interno durante o período da Copa. Os participantes registram seus palpites de placar, acompanham um ranking ao vivo e conferem o álbum de figurinhas do time.

🔗 **Produção:** https://ramonyml.github.io/bolao-mznet/

## Funcionalidades

### Site público (`index.html`)
- **Registro de palpites** com nome, setor, jogo/fase e placar.
- **Autocomplete de nome** a partir de 2 caracteres (com preenchimento automático do setor).
- **Limite de 1 palpite por jogo** — se o mesmo nome já registrou palpite para aquele jogo, o envio é bloqueado com mensagem amigável.
- **Ranking ao vivo** com pódio animado (top 3) e confete para o líder. Alterna entre modo pódio e tabela de pontos corridos.
- **Pontuação**: 5 pontos para placar exato, 2 pontos para acerto do resultado.
- **Desempate** por quem registrou o palpite primeiro.
- **Anti-trapaça**:
  - Palpites registrados após o resultado oficial são exibidos com alerta ⚠ e excluídos do ranking.
  - Palpites duplicados (mesmo nome + jogo) são exibidos com badge laranja e não contam no ranking — só o primeiro registrado é válido.
- **Filtros na lista de palpites**:
  - Tabs: **Em aberto**, **Encerrados**, **Exatos ⭐**
  - Select por jogo (independente do tab ativo)
  - Busca por nome do funcionário (independente do tab ativo)
- **Reações com emoji** (🔥 😂 👏 🐔 🍿) em cada palpite.
- **Pacotinho da sorte**: revela uma figurinha aleatória do time.
- **Figurinha do palpiteiro**: card compartilhável (imagem) com a figurinha + estatísticas.

### Ranking por setor *(engavetado — aguardando aprovação)*
- Ranking coletivo por área da empresa, usando **média de pontos por membro** para equilibrar setores de tamanhos diferentes.
- Para ativar: remover a classe `d-none` do `<section id="setor-ranking-section">` em `index.html`.

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
- [Firebase](https://firebase.google.com/) — Firestore (dados) e Authentication (admin).
- [GitHub Pages](https://pages.github.com/) — hospedagem (branch `main`).
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
│   ├── bolao-scoring.js    # Pontuação, ranking individual e ranking por setor
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
├── firebase.json           # Configuração de Firestore
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
O site é hospedado no **GitHub Pages** e atualiza automaticamente a cada push na branch `main`:

```bash
git add .
git commit -m "descrição da alteração"
git push origin main
```

## Modelo de dados (Firestore)
- **`palpites`** — leitura pública; criação pública; atualização pública apenas do campo `reactions`; edição/exclusão somente para admin.
- **`resultados`** — leitura pública; escrita somente para admin.
- **`config/features`** — flags das funcionalidades; leitura pública, escrita somente para admin.
- **`config/jogos`** — jogos customizados criados pelo admin; leitura pública, escrita somente para admin.

---

Desenvolvido por Ramony Lima · MZNET 2026
