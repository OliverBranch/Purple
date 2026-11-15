import { Gerador } from './comum';
import { gerarVirus } from './virus';
import { gerarRede } from './rede';
import { gerarServidor } from './servidor';
import { gerarEnderecos } from './enderecos';
import { gerarDiagnostico } from './diagnostico';

export const GERADORES: { [servico: string]: Gerador } = {
  virus: gerarVirus,
  rede: gerarRede,
  servidor: gerarServidor,
  enderecos: gerarEnderecos,
  diagnostico: gerarDiagnostico,
};
