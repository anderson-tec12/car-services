---
name: Óleo e fotos
overview: Adicionar marca, viscosidade e tipo do óleo (opcionais) e até duas fotos opcionais no registro de troca de óleo do motor, exibindo tudo no histórico com visualização em tela cheia.
todos:
  - id: deps-permissions
    content: Instalar expo-image-picker e expo-file-system e configurar o plugin em app.json
    status: completed
  - id: schema
    content: Migrar engine_oil_changes e atualizar create/list/delete em engineOilChanges.ts, incluindo apagar arquivos
    status: completed
  - id: form
    content: Adicionar marca, viscosidade, tipo e até 2 fotos opcionais no formulário de oleo-motor
    status: completed
  - id: history
    content: Exibir os novos dados no histórico e abrir fotos em tela cheia
    status: completed
isProject: false
---

# Óleo usado e fotos na troca

O formulário em [`app/(app)/oleo-motor.tsx`](app/(app)/oleo-motor.tsx) continua com data, quilometragem e filtro. Os dados novos são opcionais: a troca ainda pode ser salva só com o que já existe hoje. O módulo de óleo de câmbio permanece um placeholder.

## Dados

Novas colunas nullable em `engine_oil_changes`, no mesmo padrão de `ALTER TABLE` de [`src/db/index.ts`](src/db/index.ts):

- `oil_brand` — texto livre
- `oil_viscosity` — texto livre (ex.: 5W30)
- `oil_type` — `sintetico`, `semissintetico` ou `mineral`
- `photo_uri_1` e `photo_uri_2` — caminhos locais persistidos

[`src/db/engineOilChanges.ts`](src/db/engineOilChanges.ts) passa a ler, gravar e apagar esses campos. Tipo fora da lista é rejeitado. Textos vazios viram `null`.

## Fotos

Instalar com `npx expo install expo-image-picker expo-file-system` (SDK 57).

- Até 2 fotos, pela galeria (`selectionLimit` do que ainda falta) ou pela câmera.
- Ao escolher, copiar com `new File(uri).copy(...)` para `Paths.document/oil-photos/`, para não depender do cache do picker.
- Remover uma foto antes de salvar apaga o arquivo copiado.
- Apagar a troca também apaga os arquivos ligados a ela.
- Em [`app.json`](app.json), plugin `expo-image-picker` com textos em português para fotos e câmera, e `microphonePermission: false` (não gravamos áudio).

Como são módulos nativos, um APK já gerado precisa de um novo build para incluir o picker.

## Formulário

Na seção "Registrar troca", depois do filtro:

- Marca e viscosidade, mesmos campos de texto já usados na tela.
- Tipo em três opções (Sintético, Semissintético, Mineral); tocar de novo desmarca.
- Prévia das fotos com botão para remover e ações "Galeria" e "Câmera", ocultas ao chegar em 2.

## Histórico

Cada item mostra marca, viscosidade e tipo só quando preenchidos, além de data, km e filtro. Se houver foto, miniaturas; tocar abre um modal em tela cheia (`Image` com `resizeMode="contain"`, fundo escuro, fechar, e troca entre as duas quando existirem). Sem fotos, essa ação não aparece.

Registros antigos seguem válidos: colunas novas ficam vazias e o histórico não inventa texto.