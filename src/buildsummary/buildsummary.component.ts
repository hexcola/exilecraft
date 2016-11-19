import {NodeState} from "../shared/model/enums";
import { SkillTree } from "./../shared/model/skilltree";
import {Component, Input, EventEmitter, Output} from "@angular/core";
import * as Immutable from "immutable";

@Component(
{
    selector: "poe-build-summary",
    templateUrl: "buildsummary.template.html"
})
export class BuildSummary
{
	@Input("skill-tree") skillTree : SkillTree;
	private categories : Array<any>;

	public constructor()
	{

	}

	public OnNodesChanged() : void
	{
		var categoryKeys = this.skillTree.Nodes
			.filter(n => n.State == NodeState.Active)
			.flatMap(n => Immutable.List(n.Details))
			.groupBy(n => n.Category)
			.map(g => g.first().Category)
			.sort((x, y) => this.CategoryDisplayMap.keySeq().indexOf(x) - this.CategoryDisplayMap.keySeq().indexOf(y));

		this.categories = categoryKeys.map(categoryKey =>
		{
			var category = new Object();
			category["name"] = this.CategoryDisplayMap.get(categoryKey);

			category["items"] = this.skillTree.Nodes
				.filter(n => n.State == NodeState.Active)
				.flatMap(n => Immutable.List(n.Details))
				.filter(d => d.Category == categoryKey)
				.groupBy(n => n.TemplatedText)
				.map<{amount: number, templatedText: string, keyword: string}>((v, k) => <any>
				{
					amount: v.reduce((acc, d) => acc + d.Amount, 0),
					templatedText: k,
					keyword: v.first().Keyword
				})
				.groupBy(subgroup => subgroup.keyword)
				.flatMap(keywordGroup => keywordGroup.sortBy(sg => sg.amount))
				.reverse()
				.map(g => g.templatedText.replace(/#/, g.amount.toFixed(1).replace(/\.0$/, "")))
				.toArray();

			return category;
		}).toArray();
	}

	public CategoryDisplayMap = Immutable.OrderedMap<string, string>()
		.set("class", "Class")
		.set("keystonejewel", "Keystones / Jewels")
		.set("stat", "Stats")
		.set("lifemanaes", "Life/Mana/ES")
		.set("flask", "Flasks")
		.set("defense", "Defense")
		.set("elemental", "Elemental")
		.set("chaos", "Chaos")
		.set("physical", "Physical")
		.set("melee", "Melee")
		.set("attack", "Attack")
		.set("spell", "Spell")
		.set("proj", "Projectile")
		.set("damage", "Damage")
		.set("crit", "Crit")
		.set("totem", "Totem")
		.set("trapandmine", "Traps & Mines")
		.set("curse", "Curse")
		.set("minion", "Minion")
		.set("aura", "Auras")
		.set("leech", "Leech")
		.set("misc", "Miscellaneous");
}
