import "assets/styles/master.scss";
import "assets/images/leftarrow.png";
import "images";
import "data";

import { AppModule } from "./app.module";
import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

enableProdMode();
platformBrowserDynamic().bootstrapModule(AppModule);
