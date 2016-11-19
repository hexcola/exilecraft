import {Node} from "../shared/model/node";
import { Browser } from "./../shared/browser";
import { SkillTree } from "./../shared/model/skilltree";
import { Point } from "./../shared/point";
import {Component, Input} from "@angular/core";
import * as Rx from "rxjs/Rx";
import * as Immutable from "immutable";

@Component(
{
    selector: "poe-node-details",
    templateUrl: "nodedetails.template.html"
})
export class NodeDetails
{
	private currentNode : Node;
	private currentMousePosition : Point;
	@Input("skill-tree") skillTree : SkillTree;

	public constructor(private _browser : Browser)
	{

	}

	public ngOnInit()
	{
		this._browser.GlobalMouseMove.subscribe(p => this.currentMousePosition = p);
	}

	public get pointDifference() : number
	{
		var difference = this.skillTree.Nodes.count(n => n.IsHighlighted);
		if (difference == 0) difference = -this.skillTree.Nodes.count(n => n.IsOrphanHighlighted);
		return difference;
	}

	public NodeHoverChanged(nodes : Immutable.List<Node>)
	{
		var skills = nodes.filter(n => n.IsSkill);

		if (skills.isEmpty())
		{
			this.currentNode = null;
		}
		else
		{
			this.currentNode = skills.first();
		}
	}
}