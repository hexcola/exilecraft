import { NgModule, ApplicationRef } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { HttpModule } from "@angular/http";


import { BuildSummary } from "./buildsummary/buildsummary.component";
import { NodeDetails } from "./nodedetails/nodedetails.component";
import { TreeView } from "./treeview/treeview.component";
import { ActionBar } from "./actionbar/actionbar.component";
import { Browser } from "./shared/browser";

import { App } from "./app.component";

@NgModule({
	bootstrap: [App],
	// declarations: [App],
	declarations: [
		ActionBar,
		TreeView,
		NodeDetails,
		BuildSummary,
		App
	],
	imports: [
		BrowserModule,
		FormsModule,
		HttpModule
	],
	// providers: []
	providers:[Browser]
})
export class AppModule
{
	constructor(public appRef: ApplicationRef) {}
}