# ByteBank Mobile — Fase 3

Aplicativo de gerenciamento financeiro em **React Native + Expo**, com autenticação e transações no **Firebase** e recibos no **Supabase Storage**.

> FIAP Pós-Tech · Front-End Engineering · Grupo 6
> Continuação do [ByteBank Fase 2](https://github.com/FIAP-Grupo-6/bytebank-tech-02) (microfrontends web)

---

## Índice

- [O que o app faz](#o-que-o-app-faz)
- [Stack](#stack)
- [Rodando localmente](#rodando-localmente)
- [Configuração do Firebase](#configuração-do-firebase)
- [Configuração do Supabase](#configuração-do-supabase)
- [Índices do Firestore (não pule)](#índices-do-firestore-não-pule)
- [Arquitetura](#arquitetura)
- [Decisões técnicas](#decisões-técnicas)
- [Onde cada requisito foi atendido](#onde-cada-requisito-foi-atendido)
- [Problemas comuns](#problemas-comuns)

---

## O que o app faz

| Tela | Função |
|---|---|
| **Login / Cadastro** | Firebase Auth por e-mail e senha, com sessão persistida entre aberturas e recuperação de senha |
| **Início (Dashboard)** | Saldo consolidado, gráficos de categoria e evolução mensal, três seções com transição animada |
| **Transações** | Lista com scroll infinito, filtros por tipo/categoria/período e busca textual |
| **Nova/Editar transação** | Formulário com validação cruzada e upload de recibo (foto, imagem ou PDF) |
| **Perfil** | Dados da conta, totais acumulados e logout |

---

## Stack

| Camada | Escolha | Versão |
|---|---|---|
| Runtime | Expo SDK | 57 |
| | React Native / React | 0.86 / 19.2 |
| Navegação | expo-router (file-based) | 57 |
| Estado global | **Context API** (`AuthContext`, `TransactionsContext`) | — |
| Backend | Firebase Auth · Firestore | 12 |
| Arquivos | Supabase Storage (`@supabase/supabase-js`) | 2 |
| Formulários | react-hook-form + Zod | 7 / 4 |
| Gráficos | `react-native-svg` (componentes próprios) | 15 |
| Animação | `Animated` da API do React Native | — |
| Tipagem | TypeScript strict | 6 |

---

## Rodando localmente

### Pré-requisitos

- **Node.js 20 LTS ou superior**
- **npm 10+**
- App **Expo Go** no celular (Android ou iOS), ou um emulador
- Uma conta no [Firebase](https://console.firebase.google.com) (plano gratuito Spark serve — usado só para Auth e Firestore)
- Uma conta no [Supabase](https://supabase.com) (plano gratuito serve — usado só para o bucket de recibos)

### Passos

```bash
git clone <url-do-repositorio>
cd bytebank-mobile

npm install

# Credenciais do Firebase e do Supabase — ver seções abaixo
cp .env.example .env
# edite o .env com os dados dos seus projetos

npm start
```

Depois, leia o QR Code com o Expo Go (Android) ou com a câmera (iOS).

> **Sobre a versão do Expo Go:** a loja distribui apenas a build da SDK mais recente. Este projeto está na SDK 57 justamente para funcionar com o Expo Go de prateleira, **sem precisar de build nativo ou dev client**.

### Scripts

| Comando | O que faz |
|---|---|
| `npm start` | Sobe o Metro bundler |
| `npm run start:clear` | Sobe limpando o cache — use depois de mudar o `.env` |
| `npm run android` | Abre no emulador Android |
| `npm run ios` | Abre no simulador iOS (precisa de macOS) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run doctor` | Diagnóstico de dependências do Expo |

---

## Configuração do Firebase

### 1. Criar o projeto

No [console do Firebase](https://console.firebase.google.com), crie um projeto. O Google Analytics é opcional.

### 2. Registrar um app **Web**

Ainda no console: **Configurações do projeto → Seus apps → ícone `</>` (Web)**.

Registre com qualquer apelido. Copie o objeto `firebaseConfig` que aparece.

> **Por que app Web e não Android/iOS?** Porque usamos o SDK JavaScript do Firebase, que roda dentro do Expo Go. O SDK nativo (`@react-native-firebase`) exigiria `prebuild` e uma build customizada — inviável para gravar o vídeo da entrega direto do celular.

### 3. Preencher o `.env`

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:abcdef123456
```

O prefixo `EXPO_PUBLIC_` é obrigatório — é o que faz o Expo embutir a variável no bundle.

> Essas chaves **são públicas por design**: elas apenas identificam o projeto. O que protege os dados são as Security Rules do passo 6.

**Depois de editar o `.env`, reinicie com `npm run start:clear`.** O Metro cacheia variáveis de ambiente.

### 4. Ativar Authentication

**Authentication → Começar → Sign-in method → E-mail/senha → Ativar.**

### 5. Criar o Firestore

**Firestore Database → Criar banco de dados** → modo de produção → escolha a região (`southamerica-east1` para menor latência no Brasil).

> Não é preciso ativar o **Storage** do Firebase: os recibos agora vivem no Supabase (próxima seção). Desde 2024 o Firebase Storage exige o plano pago Blaze mesmo para uso dentro da cota grátis — foi exatamente isso que motivou a troca.

### 6. Publicar as Security Rules do Firestore

As regras estão versionadas em [`firebase/firestore.rules`](./firebase/firestore.rules). Sem elas, o modo de produção bloqueia tudo.

**Pelo console (mais rápido):** cole o conteúdo de `firebase/firestore.rules` em **Firestore → Regras → Publicar**.

**Ou pela CLI:**

```bash
npm install -g firebase-tools
firebase login
cd firebase
firebase deploy --only firestore:rules,firestore:indexes --project seu-projeto
```

As regras garantem que cada usuário só lê e escreve os próprios dados e validam o payload da transação no servidor (tipo válido, valor entre 0 e 1.000.000, data como timestamp).

---

## Configuração do Supabase

Usado só para o bucket de recibos — Auth e banco de dados continuam no Firebase.

### 1. Criar o projeto

No [dashboard do Supabase](https://supabase.com/dashboard), crie um projeto (região mais próxima do Brasil: `South America (São Paulo)`). Anote a senha do banco, mesmo sem usá-lo aqui.

### 2. Preencher o `.env`

Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> Assim como as chaves do Firebase, a anon key é pública por design — ela só identifica o projeto. Quem protege o bucket são as policies do passo 3.

### 3. Criar o bucket e as policies

Rode [`supabase/storage-policies.sql`](./supabase/storage-policies.sql) inteiro em **SQL Editor → New query**. Ele cria o bucket `receipts` (público de leitura, limite de 5 MB, só imagem/PDF) e as policies de insert/delete.

> **Limitação conhecida:** o app não usa Supabase Auth, então as policies não conseguem restringir escrita por usuário — qualquer cliente com a anon key grava no bucket. O isolamento por dono continua garantido pelo Firestore (só o dono da transação enxerga a URL/caminho do próprio recibo). Detalhes no comentário do próprio SQL.

**Depois de editar o `.env`, reinicie com `npm run start:clear`.**

---

## Índices do Firestore (não pule)

Os filtros combinados da listagem exigem **índices compostos**. Sem eles, o app funciona até você combinar dois filtros — e aí a consulta falha com `failed-precondition`.

**A forma mais fácil:** deixe a consulta falhar uma vez. A mensagem de erro no terminal do Metro traz um link que cria o índice exato em um clique.

**A forma correta:** faça o deploy de `firebase/firestore.indexes.json`, que já declara os cinco índices necessários:

| Índice | Serve para |
|---|---|
| `userId` + `date ↓` | Listagem sem filtro e janela dos gráficos |
| `userId` + `type` + `date ↓` | Filtro por entradas/saídas |
| `userId` + `category` + `date ↓` | Filtro por categoria |
| `userId` + `type` + `category` + `date ↓` | Os dois filtros juntos |
| `userId` + `type` | Agregação `sum()` do saldo |

```bash
cd firebase && firebase deploy --only firestore:indexes --project seu-projeto
```

A criação leva alguns minutos. Faça isso **antes** de gravar o vídeo.

---

## Arquitetura

```
bytebank-tech-03/
├── app/                          # Rotas (expo-router: arquivo = rota)
│   ├── _layout.tsx               # Providers + porteiro de autenticação
│   ├── index.tsx                 # Redireciona conforme a sessão
│   ├── (auth)/                   # login, cadastro
│   ├── (app)/                    # Abas: dashboard, transacoes, perfil
│   └── transacao/[id].tsx        # Formulário (modal). id="nova" cria
│
├── src/
│   ├── contexts/                 # ESTADO GLOBAL (Context API)
│   │   ├── AuthContext.tsx       # Sessão, login, cadastro, logout
│   │   └── TransactionsContext.tsx # Feed paginado + analytics + CRUD
│   │
│   ├── services/                 # Fronteira com Firebase/Supabase — sem React aqui
│   │   ├── transactions.service.ts  # Firestore
│   │   └── receipts.service.ts      # Supabase Storage
│   │
│   ├── schemas/                  # Validação (Zod)
│   ├── components/
│   │   ├── ui/                   # Button, Input, Card, Chip, OptionSheet…
│   │   ├── charts/               # DonutChart, GroupedBarChart (SVG próprio)
│   │   ├── dashboard/            # SectionSwitcher, BalanceHeader, SummaryCards
│   │   └── transactions/         # ListItem, FiltersSheet, CurrencyField…
│   │
│   ├── hooks/                    # useCountUp, useStaggeredEntrance, useDebouncedValue
│   ├── lib/                      # firebase, supabase, format, date, categories, errors
│   ├── theme/                    # Design tokens
│   └── types/                    # Modelo de domínio
│
├── firebase/                     # Rules e índices do Firestore, versionados
└── supabase/                     # Setup do bucket de recibos (SQL), versionado
```

**A regra de dependência é uma só:** telas → contexts → services → Firebase/Supabase. Nenhuma tela importa `firebase/*` ou `@supabase/supabase-js` direto. Isso mantém a conversão de `Timestamp` para ISO num único lugar (`toTransaction`) e permite trocar o backend sem tocar em componente — foi assim que o Storage saiu do Firebase para o Supabase sem mexer em `ReceiptField.tsx`.

### Modelo de dados

```
transactions/{transactionId}
  userId       string     ← dono; base de toda Security Rule e consulta
  type         'Credit' | 'Debit'
  value        number     ← sempre positivo; o sinal vem do type
  category     string
  subcategory  string?
  description  string?
  date         Timestamp
  receiptUrl   string?    ← URL pública no bucket do Supabase
  receiptPath  string?    ← caminho no bucket, para poder apagar
  receiptName  string?
  receiptType  string?
  createdAt    Timestamp
  updatedAt    Timestamp

users/{userId}
  displayName, email, createdAt
```

Recibos ficam no bucket `receipts` do Supabase Storage, em `receipts/{userId}/{timestamp}-{aleatório}.{ext}`.

---

## Decisões técnicas

### Gráficos escritos à mão em SVG

As bibliotecas populares de chart em React Native não rodam no Expo Go: `react-native-gifted-charts` depende de `react-native-linear-gradient` e o `victory-native` novo depende de Skia — os dois são módulos nativos. Como `react-native-svg` já vem embutido no Expo Go, os gráficos foram feitos com ele. O app roda sem `prebuild` e a demo pode ser gravada direto no celular.

### Saldo por agregação server-side, não somando a lista

Somar `items` daria um número errado: a lista é paginada e só tem 15 registros. O saldo usa `getAggregateFromServer` com `sum('value')`, que o Firebase cobra como 1 leitura por 1.000 documentos agregados — continua correto e barato com anos de histórico.

### Paginação por snapshot, não por valor de campo

`startAfter()` recebe o `QueryDocumentSnapshot` do último item, não o valor da data. Com valor, duas transações no mesmo dia fariam a paginação repetir ou pular registros; com o snapshot, o Firestore desempata sozinho.

### Busca textual no cliente

O Firestore não faz busca por substring. A busca por descrição/categoria é aplicada sobre as páginas já carregadas. Para busca real no servidor seria preciso Algolia, Typesense ou um campo de tokens — fora do escopo desta fase. A tela deixa isso explícito ao dizer "fim dos resultados carregados".

### Persistência da sessão

`initializeAuth` com `getReactNativePersistence(AsyncStorage)`. Sem isso, o Firebase usa memória e a sessão morre a cada reload — o sintoma é "preciso logar toda vez". Detalhe: `getReactNativePersistence` existe no build React Native do `@firebase/auth` e é reexportado por `firebase/auth`, mas não aparece nos tipos públicos; `src/lib/firebase.ts` resolve isso com um cast pontual e explica por quê.

### Upload no momento da escolha, não no submit

O recibo sobe assim que é selecionado, com barra de progresso. Enviando no submit, o usuário ficaria olhando um botão travado sem saber se o app morreu. O arquivo antigo só é apagado **depois** do save — se o save falhar, nada foi destruído.

### Recibos no Supabase Storage, não no Firebase

Desde 2024 o Firebase Storage exige o plano pago **Blaze** mesmo para uso dentro da cota grátis — o Firestore e o Auth continuam de graça no Spark, então só o Storage foi trocado. `receipts.service.ts` é a única peça que muda: lê o arquivo como base64 e manda um `ArrayBuffer` pro bucket `receipts` do Supabase (`src/lib/supabase.ts`), sem tocar em `ReceiptField.tsx` nem no formulário.

Efeito colateral: como o app não tem sessão Supabase (a identidade continua sendo o Firebase Auth), as policies do bucket não conseguem checar dono por `auth.uid()` como o Firestore checa. A troca foi aceitar bucket público de leitura — mesmo modelo do antigo `getDownloadURL()`, URL só descoberta por quem já tem acesso à transação — e documentar a limitação em [`supabase/storage-policies.sql`](./supabase/storage-policies.sql) em vez de simular uma segurança que não existe.

Progresso de upload também mudou: o storage-js do Supabase não expõe `bytesTransferred` como o `uploadBytesResumable` do Firebase, então a barra hoje só marca início (10%), leitura concluída (40%) e fim (100%) — sem granularidade real durante o envio.

### Valor em centavos inteiros

O campo de dinheiro guarda centavos como inteiro e formata na exibição, com digitação da direita para a esquerda (como maquininha). Máscara por regex sobre float é o que produz `19.999999999999998` e embaralha o valor quando se apaga um caractere do meio.

---

## Onde cada requisito foi atendido

### Tela principal (Dashboard)

| Requisito | Implementação |
|---|---|
| Gráficos e análises financeiras | `DonutChart` (gastos por categoria) e `GroupedBarChart` (entradas × saídas por mês), alimentados por `onSnapshot` de 6 meses em tempo real |
| **Animações entre seções com `Animated`** | [`SectionSwitcher`](./src/components/dashboard/SectionSwitcher.tsx) — indicador que desliza (`Animated.spring` em `translateX`, largura medida no layout) + conteúdo que sai e entra pelo lado correspondente à direção do toque (`Animated.sequence` de `opacity` e `translateX`), tudo com `useNativeDriver: true` |
| Animações extras | `useCountUp` (saldo subindo do zero) e `useStaggeredEntrance` (cards em cascata) |

### Tela de listagem de transações

| Requisito | Implementação |
|---|---|
| Filtros avançados (data, categoria…) | `FiltersSheet`: tipo, categoria, período com atalhos e intervalo personalizado, mais busca textual. Chips mostram o que está ativo e removem individualmente |
| **Scroll infinito** | `FlatList` + `onEndReached` → `loadMore()` → `startAfter(cursor)` com `limit(15)`. Deduplicação por `id` porque `onEndReached` dispara duas vezes em scroll rápido |
| Busca integrada ao Cloud Firestore | Consultas sempre com `where('userId', '==', uid)`; filtros traduzidos para `where`/`orderBy` em `buildConstraints` |

### Tela de adicionar/editar transação

| Requisito | Implementação |
|---|---|
| Adicionar e editar | Rota única `transacao/[id]` — `id="nova"` cria, qualquer outro edita |
| **Validação avançada** de valor e categoria | [`transaction.schema.ts`](./src/schemas/transaction.schema.ts): valor > 0, teto de R$ 1.000.000, no máximo 2 casas decimais; **categoria coerente com o tipo**; **subcategoria coerente com a categoria**; data não futura nem anterior a 2000; recibo consistente (URL sempre com caminho no bucket). As regras cruzadas ficam num `superRefine` — nenhum validador de campo isolado as pegaria |
| **Upload de recibos no Supabase Storage** | `ReceiptField` + `receipts.service.ts`: câmera, galeria ou PDF; leitura base64 → `ArrayBuffer` → `supabase.storage.upload()`, com barra de progresso simulada (o SDK não expõe progresso granular) |

### Tecnologias e conceitos

| Requisito | Implementação |
|---|---|
| React Native com Expo | Expo SDK 57, projeto managed, roda no Expo Go |
| **Gerenciamento de estado com Context API** | `AuthContext` (autenticação) e `TransactionsContext` (transações), como o enunciado pede |
| Boas práticas de performance | `FlatList` virtualizada, `memo` no item de lista, `useMemo` nos derivados, `useCallback` nas ações do contexto, guarda de race condition por `requestId`, debounce na busca, animações no driver nativo |

---

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `Firebase não configurado. Faltam as chaves...` | `.env` ausente ou incompleto. Preencha e rode `npm run start:clear` |
| `Supabase não configurado. Faltam as chaves...` | Falta `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` no `.env`. Veja [Configuração do Supabase](#configuração-do-supabase) |
| `auth/invalid-api-key` | O `.env` foi editado sem limpar o cache do Metro. `npm run start:clear` |
| `auth/operation-not-allowed` | E-mail/senha não foi ativado em Authentication → Sign-in method |
| `The query requires an index` / `failed-precondition` | Índice composto faltando. Clique no link do erro ou faça o deploy de `firestore.indexes.json` |
| `Missing or insufficient permissions` | Security Rules do Firestore não publicadas. Veja o passo 6 |
| Preciso logar a cada abertura | Persistência não ativou. Confira `src/lib/firebase.ts` e se `@react-native-async-storage/async-storage` está instalado |
| Recibo não envia / `Bucket not found` | O SQL de `supabase/storage-policies.sql` não foi rodado no projeto certo. Confira se `EXPO_PUBLIC_SUPABASE_URL` aponta pro mesmo projeto |
| Gráficos vazios com transações cadastradas | A janela dos gráficos é de 6 meses. Transações mais antigas aparecem na listagem, não nos gráficos |
| `Unable to resolve module ...` | `rm -rf node_modules && npm install && npm run start:clear` |

---
