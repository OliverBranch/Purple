import type { Incidente, Regras } from '../../core/incidente';
import type { Ctx } from './comum';
import { REGRAS_VIRUS, gerarVirus } from './virus';
import { REGRAS_SERVIDOR, gerarServidor } from './servidor';
import { REGRAS_REDE, gerarRede } from './rede';
import { REGRAS_ENDERECOS, gerarEnderecos } from './enderecos';
import { REGRAS_DIAG, gerarDiagnostico } from './diagnostico';

export const GERADORES: Record<string, (c: Ctx) => Incidente> = {
  virus: (c) => gerarVirus(c),
  servidor: gerarServidor,
  rede: gerarRede,
  enderecos: gerarEnderecos,
  diagnostico: gerarDiagnostico,
};

export const REGRAS: Record<string, Regras> = {
  virus: REGRAS_VIRUS,
  servidor: REGRAS_SERVIDOR,
  rede: REGRAS_REDE,
  enderecos: REGRAS_ENDERECOS,
  diagnostico: REGRAS_DIAG,
};
