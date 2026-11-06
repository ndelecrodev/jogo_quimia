# Checklist da feira

Marque cada item. Faça a parte "Véspera" com tudo montado como será no stand.

## Véspera (montagem e teste)
- [ ] Notebook carregado, com carregador e extensão de energia no stand.
- [ ] Chrome e Python instalados; `iniciar.bat` abre o jogo em tela cheia.
- [ ] **Sem internet**: desligue o Wi-Fi e abra o jogo mesmo assim.
- [ ] Controle de PS5 conecta (cabo USB e Bluetooth) e aparece "DualSense (PS5) conectado" no canto da tela.
- [ ] ✕ confirma, ○ volta, Options pausa; tirar o cabo/desligar o controle **no meio da partida pausa o jogo** e ✕ retoma.
- [ ] Teclado funciona (Espaço, setas, Esc; no apelido e no contato dá para digitar e apagar).
- [ ] **F3** mostra os FPS: em jogo, 55-60 FPS no notebook do stand.
- [ ] TV/2º monitor: `iniciar_ranking.bat` mostra o ranking, atualiza ao vivo depois de uma partida e mostra "Campeão em HH:MM:SS".
- [ ] **Jogou os 4 jogos até o fim** (Kemi Bolha, Pode Misturar?, Kemi Sobe, Kemi Runner) com teclado **e** controle. Dificuldade ok para iniciantes (40-60 s de jogo).
- [ ] Partida parada (sem apertar nada) mostra "Vamos de novo?" e **não** gasta tentativa nem dá código.
- [ ] Tela final mostra pontos, posição, o **brinde** e o **apelido grande** (sem código); não existe "Jogar de novo"; abaixo do mínimo diz "Quase lá!".
- [ ] Depois do fim de partida (e do contato, se pedir) cai no **Hub** com "Sua jogada oficial já foi!"; 15 s sem apertar nada volta à atração e limpa o apelido; Esc/○ no Hub troca de jogador.
- [ ] Entrou no Top 3 ou bateu a meta: aparece a tela de contato (foco inicial na 1ª tecla, Enter salva com 5+ caracteres, SALVAR cinza antes disso, linha de consentimento visível, "agora não" com ○/Esc) e depois volta direto ao Hub (sem tela de QR).
- [ ] **QR codes abrem a página certa** ao escanear com um celular (usuário e empresa) no painel de convite da **atração**. Se ainda não há link, aparece "Em breve".
- [ ] Admin: `Ctrl+Shift+A`; **PIN criado** e anotado só com a equipe; buscar por **apelido** e por código; "Marcar brinde entregue"; exportar CSV; exportar JSON.
- [ ] Admin: **nenhum alerta vermelho** de pendências (ou só os que a equipe decidiu deixar).
- [ ] Brindes, metas, hora do campeão, Instagram, hashtag e links conferidos (veja o `PENDENCIAS.md`).
- [ ] **Pares do Pode Misturar? conferidos com as FDS** (nenhum erro de segurança) e marcados `validar: false`.
- [ ] **Calibrar** (admin): metas e "par" ajustados depois de algumas partidas de pessoas de verdade.
- [ ] Imagens da Kemi aparecem (sem "Kemi desenhada em código") e as silhuetas dos produtos são distintas no Pode Misturar?.
- [ ] Som audível, mas baixo; tecla **M** muta.
- [ ] `testes.html` abre e tudo está verde.
- [ ] Versão hospedada (GitHub Pages) aberta uma vez com internet e funcionando offline depois (rodou `python scripts/gerar_sw.py` antes de publicar).
- [ ] Brindes físicos separados por tipo (participação, meta, master) e onde guardar.
- [ ] **Admin > "Zerar tudo para abrir a feira"** (com o PIN), em **cada** navegador/computador usado nos testes.
- [ ] Ranking vazio na abertura ("Seja o primeiro do ranking!").

## Abertura do stand
- [ ] `iniciar.bat` e `iniciar_ranking.bat` rodados.
- [ ] Atração aparecendo (Kemi, ranking, "aperte para jogar").
- [ ] Nenhuma partida de teste sobrou (admin mostra 0 partidas).
- [ ] Ao menos 2 pessoas da equipe sabem usar o admin e o plano B.

## Durante o evento
- [ ] Ver de hora em hora: controle carregado, jogo respondendo, TV atualizando.
- [ ] Conferir **sempre o apelido no admin** (busca) antes de entregar brinde: tem que estar "AINDA NÃO ENTREGUE".
- [ ] Anotar problemas e sugestões (o que confundiu as pessoas, onde a fila trava).
- [ ] **Exportar JSON** na metade do evento (backup).

## Encerramento
- [ ] Anunciar o campeão (líder do Ranking Geral na hora marcada).
- [ ] **Exportar CSV e JSON** e guardar em pelo menos 2 lugares.
- [ ] Se houver mais de uma estação: importar os JSON na principal.
- [ ] Brindes entregues x códigos: conferir no admin.
- [ ] Contatos coletados: guardar com cuidado e só usar para o que foi avisado (LGPD).

## Nuvem (Supabase) — só se for usar
- [ ] SQL colado (blocos 1 a 5) e **`verificar.sql` com todas as linhas `ok = true`**.
- [ ] PIN da nuvem definido (6+ dígitos) e anotado só com a equipe.
- [ ] URL e chave **anon** no `supabase.runtime.js` (**nunca a service_role**) e `enabled: true`; site publicado.
- [ ] Cada computador com **código de estação** diferente (E1, E2…).
- [ ] Jogou uma partida e ela apareceu em `plays` e `ranking_public` (Supabase > Table Editor).
- [ ] **Teste do Wi-Fi:** desligou o Wi-Fi, jogou 3 partidas, religou: as 3 chegaram, sem duplicar.
- [ ] A TV (`ranking.html`) mostra o ranking das duas estações e continua mostrando sem internet.
- [ ] Admin > Nuvem: entrou com o PIN, marcou entrega, exportou o CSV, apagou um contato.
- [ ] **Zerou tudo**: admin local **e** "Zerar TUDO na nuvem". A TV mostra "Seja o primeiro do ranking!".
- [ ] Sabe fazer o **plano B** (desligar a nuvem em 1 minuto).
- [ ] No encerramento: CSV exportado e guardado em 2 lugares, depois `limpar_apos_evento.sql` (LGPD).
