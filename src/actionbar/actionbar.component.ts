import { AscendancyClassSpec } from "./../shared/model/ascendancyclassspec";
import { ClassSpec } from "./../shared/model/classspec";
import { SkillTree } from "./../shared/model/skilltree";
import {Component, Input, EventEmitter, Output} from "@angular/core";

@Component(
{
	selector: "poe-action-bar",
	templateUrl: "actionbar.template.html"
})
export class ActionBar
{
	private importBuildUrl : string;
	private loadFailed : boolean;
	@Input("skill-tree") skillTree : SkillTree;
	@Input("points-spent") pointsSpent : number;
	@Input("ascendancy-points-spent") ascendancyPointsSpent : number;
	@Input("selected-class") selectedClass : number;
	@Input("selected-sub-class") selectedSubClass : number;
	@Output("selected-class-changed") selectedClassChanged : EventEmitter<number>;
	@Output("selected-sub-class-changed") selectedSubClassChanged : EventEmitter<number>;
	@Output("import-build") importBuild : EventEmitter<string>;
	@Output("reset-build") resetBuild : EventEmitter<any>;
	@Output("searched-nodes") searchedNodes : EventEmitter<any>;

	public constructor()
	{
		this.importBuild = new EventEmitter<string>();
		this.selectedClassChanged = new EventEmitter<number>();
		this.selectedSubClassChanged = new EventEmitter<number>();
		this.resetBuild = new EventEmitter<string>();
		this.searchedNodes = new EventEmitter<string>();
	}

	public get Classes() : Array<ClassSpec>
	{
		return this.skillTree.ClassSpecs.toArray();
	}

	public get CurrentlyAvailableSubClass() : Array<AscendancyClassSpec>
	{
		return this.skillTree.SelectedClass.SubClasses.toArray();
	}

	public ImportBuild() : void
	{
		this.importBuild.emit(this.importBuildUrl)
		this.importBuildUrl = "";
	}

	public LoadFailed() : void
	{
		this.loadFailed = true;
		setTimeout(() => { this.loadFailed = false; }, 5000);
	}
}
