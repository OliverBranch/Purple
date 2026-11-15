import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { injetarIcones } from './app/arte/icones';

injetarIcones();
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
