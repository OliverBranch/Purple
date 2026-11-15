import { Component, inject } from '@angular/core';
import { JogoService } from './jogo.service';
import { CriacaoComponent } from './ui/criacao';
import { JogoTelaComponent } from './ui/jogo-tela';
import { RetratoComponent } from './ui/retrato';
import { Aparencia } from './core/tipos';

@Component({
  selector: 'app-root',
  imports: [CriacaoComponent, JogoTelaComponent, RetratoComponent],
  template: `
  <div class="raiz" (pointerdown)="jogo.som.iniciar()">
    @switch (jogo.tela()) {
      @case ('titulo') {
        <div class="titulo">
          <div class="estrelas-fundo"></div>
          <div class="logo">
            <h1>PURPLE</h1>
            <p>Uma empresa de segurança, da garagem ao campus</p>
          </div>
          <div class="desfile">
            <app-retrato [pessoa]="fundador" [escala]="5" />
            <app-retrato [gato]="jogo.gatoPadrao()" [escala]="5" />
          </div>
          <div class="menu-titulo">
            @if (jogo.temSave()) { <button class="botao primario" (click)="continuar()">Continuar</button> }
            <button class="botao" [class.primario]="!jogo.temSave()" (click)="novo()">Nova empresa</button>
          </div>
          <small class="rodape-titulo">Conteúdo: Analista de TI · Segurança da Informação · Ato 1 de 5</small>
        </div>
      }
      @case ('criar') { <app-criacao /> }
      @case ('jogo') { <app-jogo-tela /> }
    }
  </div>`,
})
export class App {
  readonly jogo = inject(JogoService);
  readonly fundador: Aparencia = { pele: 2, cabelo: 3, corCabelo: 0, barba: 0, roupa: 2, corRoupa: 3, corCalca: 0, acessorio: 1 };

  novo(): void {
    this.jogo.som.iniciar();
    this.jogo.som.clique();
    this.jogo.tela.set('criar');
  }

  continuar(): void {
    this.jogo.som.iniciar();
    this.jogo.som.clique();
    this.jogo.continuar();
  }
}
