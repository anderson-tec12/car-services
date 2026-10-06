---
name: Óleo de câmbio
overview: "Implementar o módulo de troca de óleo de câmbio no mesmo fluxo do óleo do motor e do arrefecimento: registro local, fotos e aviso que vence aos 40.000 km ou em 2 anos."
todos:
  - id: schema-crud
    content: Tabela transmission_oil_changes, CRUD, intervalo 40.000 km / 24 meses e persistência de fotos
    status: completed
  - id: screen
    content: Substituir o placeholder de oleo-cambio pelo formulário (data, km, marca, fotos) e histórico
    status: completed
  - id: alerts-readme
    content: Card de óleo de câmbio em Avisos e atualizar o README
    status: completed
isProject: false
---

# Troca de óleo de câmbio

A rota [`app/(app)/oleo-cambio.tsx`](app/(app)/oleo-cambio.tsx), o item da home e o título do stack já existem. A tela hoje só mostra o placeholder de [`src/components/ModuleScreen.tsx`](src/components/ModuleScreen.tsx). O módulo novo segue o padrão de [`src/db/coolantChanges.ts`](src/db/coolantChanges.ts) e da tela de óleo do motor, com campos mais enxutos.

Intervalo confirmado: **40.000 km ou 24 meses**, o que ocorrer primeiro. O status colorido continua só pela data, como óleo e arrefecimento — o app não guarda a quilometragem atual do veículo.

## Dados

Nova tabela `transmission_oil_changes` em [`src/db/index.ts`](src/db/index.ts), ligada a `vehicles`:

- `changed_on`, `odometer_km` (obrigatórios)
- `oil_brand` (opcional)
- `photo_uri_1`, `photo_uri_2` (opcionais, no máximo 2 fotos)
- `created_at`

Novo [`src/db/transmissionOilChanges.ts`](src/db/transmissionOilChanges.ts): listar, criar, apagar e `getNextTransmissionOilDue`. Constantes `TRANSMISSION_OIL_INTERVAL_KM = 40_000` e `TRANSMISSION_OIL_INTERVAL_MONTHS = 24`. A data seguinte usa `addMonthsClamped` já existente em [`src/db/engineOilChanges.ts`](src/db/engineOilChanges.ts).

Fotos em [`src/db/transmissionOilPhotos.ts`](src/db/transmissionOilPhotos.ts), pasta `transmission-oil-photos/` em `Paths.document`, no mesmo fluxo de copiar ao salvar e apagar o arquivo junto com o registro.

## Formulário

Substituir o placeholder em [`app/(app)/oleo-cambio.tsx`](app/(app)/oleo-cambio.tsx) pelo fluxo já usado em óleo do motor:

- data da troca (obrigatória)
- quilometragem do hodômetro (obrigatória — é a base do aviso por km)
- marca do óleo (opcional)
- até 2 fotos, galeria ou câmera (opcionais), com visualização e exclusão do registro

Lista o histórico do veículo ativo e permite apagar uma troca.

## Avisos

Em [`app/(app)/avisos.tsx`](app/(app)/avisos.tsx), terceiro card **Óleo de câmbio**: última troca, próxima data ou quilometragem (`o que ocorrer primeiro`) e status “vencida pela data” / “dentro do prazo pela data”. Sem registro, a mesma mensagem vazia dos outros módulos.

Atualizar a tabela de módulos em [`README.md`](README.md) para marcar óleo de câmbio como completo, com intervalo de 40.000 km ou 24 meses.
