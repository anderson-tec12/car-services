---
name: Filtro e exclusão
overview: Na troca de óleo do motor, registrar se o filtro foi trocado e permitir apagar um registro salvo por engano. O prazo em Avisos continua calculado pela troca mais recente.
todos:
  - id: migration
    content: Adicionar coluna filter_changed e função de exclusão em engineOilChanges
    status: completed
  - id: oil-screen
    content: Toggle de filtro no formulário, status no histórico e botão Apagar com confirmação
    status: completed
  - id: verify
    content: Rodar typecheck e lint
    status: completed
isProject: false
---

# Filtro na troca de óleo e exclusão do registro

A tela [`app/(app)/oleo-motor.tsx`](app/(app)/oleo-motor.tsx) grava só data e quilometragem. O toggle e o botão de apagar entram nesse mesmo formulário e no histórico. Avisos não ganha texto novo: ele já recalcula o prazo a partir da lista, então apagar a troca mais recente atualiza o card na próxima visita.

## Dados

Em [`src/db/index.ts`](src/db/index.ts), a tabela já existe nos aparelhos. `CREATE TABLE IF NOT EXISTS` não adiciona coluna. Depois do create, consultar `PRAGMA table_info(engine_oil_changes)` e, se faltar, rodar:

```sql
ALTER TABLE engine_oil_changes
ADD COLUMN filter_changed INTEGER NOT NULL DEFAULT 0
```

Registros já salvos ficam como filtro não trocado.

Em [`src/db/engineOilChanges.ts`](src/db/engineOilChanges.ts):

- `filterChanged: boolean` em `EngineOilChange` (0/1 no SQLite).
- `createEngineOilChange` recebe `filterChanged` e grava no `INSERT`.
- Nova `deleteEngineOilChange(id, vehicleId)` com `DELETE ... WHERE id = ? AND vehicle_id = ?`, para apagar só o registro do veículo ativo.

## Tela

No formulário, abaixo da quilometragem:

- Interruptor nativo (`Switch`) com o rótulo **Filtro trocado**.
- Começa desligado. Depois de salvar, volta a desligado junto com a data de hoje e o km limpo.

No histórico, cada item ganha uma linha **Filtro trocado** ou **Sem troca de filtro**, e um botão **Apagar**. O toque abre confirmação (`Cancelar` / `Apagar`). Confirmado, remove o registro e recarrega a lista. Se a lista esvaziar, volta o texto “Nenhuma troca registrada.”

## Verificação

`npx tsc --noEmit` e `npx expo lint`. No app: salvar com o interruptor ligado e desligado, conferir o histórico, apagar um item e cancelar outro, e abrir Avisos depois de apagar a troca mais recente.