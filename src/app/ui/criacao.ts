import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JogoService } from '../jogo.service';
import { RetratoComponent } from './retrato';
import { Aparencia, GatoDef } from '../core/tipos';
import { CORES_CABELO, CORES_CALCA, CORES_MARCA, CORES_ROUPA, NOMES_ACESSORIO, NOMES_BARBA, NOMES_CABELO, NOMES_ROUPA, PELES } from '../arte/pixel';
import { ACESSORIOS_GATO, CORES_ACESSORIO_GATO, NOMES_OLHOS_GATO, OLHOS_GATO, PELAGENS } from '../arte/gato';
import { ORIGENS, PERSONALIDADES } from '../conteudo/servicos';

@Component({
  selector: 'app-criacao',
  imports: [FormsModule, RetratoComponent],
  template: `
  <div class="fundo-criacao">
    <div class="passos">
      @for (p of nomesPassos; track $index) {
        <button class="passo" [class.ativo]="passo() === $index" (click)="ir($index)">{{ $index + 1 }}. {{ p }}</button>
      }
    </div>

    @if (passo() === 0) {
      <div class="janela criacao">
        <div class="palco">
          <app-retrato [pessoa]="ap()" [marca]="marca()" [escala]="8" />
          <button class="botao pequeno" (click)="sortear()">Sortear visual</button>
        </div>
        <div class="opcoes">
          <h2>Quem fundou a empresa</h2>
          <label class="campo">Nome<input [(ngModel)]="nome" maxlength="24" placeholder="Seu nome" /></label>
          <div class="linha"><span>Pele</span><div class="cores">@for (c of PELES; track $index) { <button class="cor" [style.background]="c" [class.sel]="ap().pele === $index" (click)="set('pele', $index)"></button> }</div></div>
          <div class="linha"><span>Cabelo</span>
            <div class="seletor"><button (click)="ciclar('cabelo', -1, NOMES_CABELO.length)">‹</button><b>{{ NOMES_CABELO[ap().cabelo] }}</b><button (click)="ciclar('cabelo', 1, NOMES_CABELO.length)">›</button></div></div>
          <div class="linha"><span></span><div class="cores">@for (c of CORES_CABELO; track $index) { <button class="cor" [style.background]="c" [class.sel]="ap().corCabelo === $index" (click)="set('corCabelo', $index)"></button> }</div></div>
          <div class="linha"><span>Barba</span>
            <div class="seletor"><button (click)="ciclar('barba', -1, NOMES_BARBA.length)">‹</button><b>{{ NOMES_BARBA[ap().barba] }}</b><button (click)="ciclar('barba', 1, NOMES_BARBA.length)">›</button></div></div>
          <div class="linha"><span>Roupa</span>
            <div class="seletor"><button (click)="ciclar('roupa', -1, NOMES_ROUPA.length)">‹</button><b>{{ NOMES_ROUPA[ap().roupa] }}</b><button (click)="ciclar('roupa', 1, NOMES_ROUPA.length)">›</button></div></div>
          <div class="linha"><span></span><div class="cores">@for (c of CORES_ROUPA; track $index) { <button class="cor" [style.background]="c" [class.sel]="ap().corRoupa === $index" (click)="set('corRoupa', $index)"></button> }</div></div>
          <div class="linha"><span>Calça</span><div class="cores">@for (c of CORES_CALCA; track $index) { <button class="cor" [style.background]="c" [class.sel]="ap().corCalca === $index" (click)="set('corCalca', $index)"></button> }</div></div>
          <div class="linha"><span>Acessório</span>
            <div class="seletor"><button (click)="ciclar('acessorio', -1, NOMES_ACESSORIO.length)">‹</button><b>{{ NOMES_ACESSORIO[ap().acessorio] }}</b><button (click)="ciclar('acessorio', 1, NOMES_ACESSORIO.length)">›</button></div></div>
          <h3>Origem</h3>
          <div class="origens">
            @for (o of ORIGENS; track $index) {
              <button class="origem" [class.sel]="origem() === $index" (click)="origem.set($index); jogo.som.clique()"><b>{{ o.nome }}</b><small>{{ o.desc }}</small></button>
            }
          </div>
        </div>
      </div>
    }

    @if (passo() === 1) {
      <div class="janela criacao">
        <div class="palco">
          <div class="placa" [style.--marca]="marca()">
            <div class="logo-marca">{{ (empresa || 'Purple').slice(0, 1) }}</div>
            <div class="nome-marca">{{ empresa || 'Purple' }}</div>
            <small>Segurança da Informação · desde 1995</small>
          </div>
          <app-retrato [pessoa]="ap()" [marca]="marca()" [escala]="5" [girar]="false" />
        </div>
        <div class="opcoes">
          <h2>A empresa</h2>
          <label class="campo">Nome da empresa<input [(ngModel)]="empresa" maxlength="20" placeholder="Purple" /></label>
          <div class="linha"><span>Cor da marca</span><div class="cores">@for (c of CORES_MARCA; track $index) { <button class="cor grande" [style.background]="c" [class.sel]="corMarca() === $index" (click)="corMarca.set($index); jogo.som.clique()"></button> }</div></div>
          <p class="nota">A cor tinge a placa da garagem, a caneca, o boné e a estampa da camiseta.</p>
          <p class="nota">É janeiro de 1995. A Internet comercial está chegando ao Brasil, os vírus viajam de disquete e quase ninguém tem firewall. Você tem uma garagem, R$ 1.500 e um sofá herdado.</p>
        </div>
      </div>
    }

    @if (passo() === 2) {
      <div class="janela criacao">
        <div class="palco">
          <app-retrato [gato]="gato()" [escala]="8" />
          <button class="botao pequeno" (click)="sortearGato()">Sortear gato</button>
        </div>
        <div class="opcoes">
          <h2>O primeiro funcionário</h2>
          <p class="nota">Apareceu na garagem no primeiro dia e não foi mais embora. Não recebe salário. Recebe sachê.</p>
          <label class="campo">Nome<input [(ngModel)]="nomeGato" maxlength="16" placeholder="Mingau" /></label>
          <div class="linha"><span>Pelagem</span>
            <div class="seletor"><button (click)="ciclarGato('pelagem', -1, PELAGENS.length)">‹</button><b>{{ PELAGENS[gato().pelagem]?.nome }}</b><button (click)="ciclarGato('pelagem', 1, PELAGENS.length)">›</button></div></div>
          <div class="linha"><span>Olhos</span><div class="cores">@for (c of OLHOS_GATO; track $index) { <button class="cor" [title]="NOMES_OLHOS_GATO[$index]" [style.background]="c" [class.sel]="gato().olhos === $index" (click)="setGato('olhos', $index)"></button> }</div></div>
          <div class="linha"><span>Acessório</span>
            <div class="seletor"><button (click)="ciclarGato('acessorio', -1, ACESSORIOS_GATO.length)">‹</button><b>{{ ACESSORIOS_GATO[gato().acessorio] }}</b><button (click)="ciclarGato('acessorio', 1, ACESSORIOS_GATO.length)">›</button></div></div>
          @if (gato().acessorio > 0) {
            <div class="linha"><span></span><div class="cores">@for (c of CORES_ACESSORIO_GATO; track $index) { <button class="cor" [style.background]="c" [class.sel]="gato().corAcessorio === $index" (click)="setGato('corAcessorio', $index)"></button> }</div></div>
          }
          <h3>Personalidade</h3>
          <div class="origens">
            @for (p of PERSONALIDADES; track $index) {
              <button class="origem" [class.sel]="gato().personalidade === $index" (click)="setGato('personalidade', $index)"><b>{{ p.nome }}</b><small>{{ p.desc }}</small></button>
            }
          </div>
          <p class="nota">Nos desafios, um sachê chama o gato, que derruba uma alternativa errada. São 3 sachês por dia.</p>
        </div>
      </div>
    }

    <div class="rodape-criacao">
      <button class="botao" (click)="passo() === 0 ? voltarTitulo() : ir(passo() - 1)">{{ passo() === 0 ? 'Voltar' : 'Anterior' }}</button>
      @if (passo() < 2) { <button class="botao primario" (click)="ir(passo() + 1)">Próximo</button> }
      @else { <button class="botao primario" (click)="comecar()">Abrir a garagem</button> }
    </div>
  </div>`,
})
export class CriacaoComponent {
  readonly jogo = inject(JogoService);
  readonly PELES = PELES; readonly CORES_CABELO = CORES_CABELO; readonly CORES_ROUPA = CORES_ROUPA; readonly CORES_CALCA = CORES_CALCA; readonly CORES_MARCA = CORES_MARCA;
  readonly NOMES_CABELO = NOMES_CABELO; readonly NOMES_BARBA = NOMES_BARBA; readonly NOMES_ROUPA = NOMES_ROUPA; readonly NOMES_ACESSORIO = NOMES_ACESSORIO;
  readonly PELAGENS = PELAGENS; readonly OLHOS_GATO = OLHOS_GATO; readonly NOMES_OLHOS_GATO = NOMES_OLHOS_GATO; readonly ACESSORIOS_GATO = ACESSORIOS_GATO; readonly CORES_ACESSORIO_GATO = CORES_ACESSORIO_GATO;
  readonly ORIGENS = ORIGENS; readonly PERSONALIDADES = PERSONALIDADES;
  readonly nomesPassos = ['Fundador', 'Empresa', 'Gato'];

  readonly passo = signal(0);
  readonly ap = signal<Aparencia>({ pele: 1, cabelo: 1, corCabelo: 0, barba: 0, roupa: 0, corRoupa: 0, corCalca: 0, acessorio: 0 });
  readonly origem = signal(4);
  readonly corMarca = signal(0);
  readonly gato = signal<GatoDef>({ nome: 'Mingau', pelagem: 0, olhos: 0, acessorio: 1, corAcessorio: 0, personalidade: 0 });
  nome = '';
  empresa = '';
  nomeGato = '';

  marca(): string {
    return CORES_MARCA[this.corMarca()] ?? '#8b5cf6';
  }

  ir(i: number): void {
    this.jogo.som.clique();
    this.passo.set(Math.max(0, Math.min(2, i)));
  }

  voltarTitulo(): void {
    this.jogo.som.clique();
    this.jogo.tela.set('titulo');
  }

  set(k: keyof Aparencia, v: number): void {
    this.jogo.som.clique();
    this.ap.update((a) => ({ ...a, [k]: v }));
  }

  ciclar(k: keyof Aparencia, d: number, n: number): void {
    this.set(k, (this.ap()[k] + d + n) % n);
  }

  setGato(k: keyof GatoDef, v: number): void {
    this.jogo.som.clique();
    this.gato.update((g) => ({ ...g, [k]: v }));
  }

  ciclarGato(k: 'pelagem' | 'acessorio', d: number, n: number): void {
    this.setGato(k, (this.gato()[k] + d + n) % n);
  }

  sortear(): void {
    const r = (n: number) => Math.floor(Math.random() * n);
    this.jogo.som.clique();
    this.ap.set({ pele: r(PELES.length), cabelo: r(NOMES_CABELO.length), corCabelo: r(CORES_CABELO.length), barba: Math.random() < 0.6 ? 0 : r(NOMES_BARBA.length), roupa: r(NOMES_ROUPA.length), corRoupa: r(CORES_ROUPA.length), corCalca: r(CORES_CALCA.length), acessorio: Math.random() < 0.4 ? 0 : r(NOMES_ACESSORIO.length) });
  }

  sortearGato(): void {
    const r = (n: number) => Math.floor(Math.random() * n);
    this.jogo.som.miau();
    this.gato.update((g) => ({ ...g, pelagem: r(PELAGENS.length), olhos: r(OLHOS_GATO.length), acessorio: r(ACESSORIOS_GATO.length), corAcessorio: r(CORES_ACESSORIO_GATO.length) }));
  }

  comecar(): void {
    this.jogo.som.fanfarra();
    this.jogo.novo({
      fundador: this.ap(),
      nomeFundador: this.nome.trim() || 'Fundador',
      origem: this.origem(),
      empresa: this.empresa.trim() || 'Purple',
      corMarca: this.corMarca(),
      gato: { ...this.gato(), nome: this.nomeGato.trim() || 'Mingau' },
    });
  }
}
