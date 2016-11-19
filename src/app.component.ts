import { SkillTreeDataParser } from './shared/parsing/skilltreedataparser';
import { ImageLoader } from './shared/imageloader';
import {NodeType} from "./shared/model/enums";
import {NodeState} from "./shared/model/enums";
import { ParsingConstants } from "./shared/parsing/parsingconstants";
import { TreeConverter } from "./shared/parsing/treeconverter";
import { SkillTree } from "./shared/model/skilltree";
import { Size } from "./shared/size";
import { BuildSummary } from "./buildsummary/buildsummary.component";
import { NodeDetails } from "./nodedetails/nodedetails.component";
import { TreeView } from "./treeview/treeview.component";
import { ActionBar } from "./actionbar/actionbar.component";
import { Browser } from "./shared/browser";
import {Component, ViewChild, NgZone} from "@angular/core";
import * as Rx from "rxjs/Rx";
import * as Immutable from "immutable";
import * as URI from "urijs";

var ascendancyData = require("assets/data/ascendancy.json");
var skillTreeData = require("assets/data/skilltree.json");

// @Component(
// {
// 	selector: "poe-skill-tree-app",
// 	templateUrl: "app.template.html",
// 	providers: [Browser],
// 	directives: [ActionBar, TreeView, NodeDetails, BuildSummary]
// })
@Component(
{
	selector: "poe-skill-tree-app",
	templateUrl: "app.template.html",
})

export class App
{
	private windowSize : Size;
	private skillTree : SkillTree;
	private lastKnownHash : string;
	private dockingArea : any;
	private buildSummaryHidden : boolean;
	@ViewChild(TreeView) treeView : TreeView;
	@ViewChild(ActionBar) acitonBar : ActionBar;
	@ViewChild(BuildSummary) buildSummary : BuildSummary;

	public constructor(private browser : Browser, private zone : NgZone)
	{
		this.browser.WindowSize.subscribe(size => this.windowSize = size);
		this.browser.WindowSize.subscribe(size => this.OnWindowResize(size));
	}

	public ngOnInit()
	{
		ImageLoader.FillCache();
		ParsingConstants.Configure(skillTreeData);
		new SkillTreeDataParser(skillTreeData, ascendancyData).Parse().then(tree =>	this.OnTreeInitialized(tree));
	}

	public ngAfterViewInit()
	{
		this.browser.OnHashChange.subscribe(e =>
		{
			var newHash = this.getHash(e.newURL);
			if (newHash == this.lastKnownHash) return;
			this.skillTree.CreateBuild(Immutable.List<number>(TreeConverter.Decode(newHash)));
			this.lastKnownHash = newHash;
			this.treeView.Invalidate();
		});
	}

	private OnToggleBuildSummary() : void
	{
		this.buildSummaryHidden = !this.buildSummaryHidden
		setTimeout(() => this.treeView.Invalidate());
	}

	private OnWindowResize(size : Size) : void
	{
		if (this.treeView) this.treeView.Invalidate();
	}

	private OnSearch(query : string) : void
	{
		this.skillTree.HighlightSearchMatches(query);
		this.treeView.Invalidate();
	}

	private OnBuildReset() : void
	{
		this.skillTree.ActivateClass(0);
		this.treeView.CenterOnActiveClass();
		this.StoreBuildInHash();
	}

	private OnSelectedClassChanged(classId : number) : void
	{
		this.skillTree.ActivateClass(classId);
		this.treeView.CenterOnActiveClass();
		this.StoreBuildInHash();
	}

	private OnSelectedSubClassChanged(subClassId : number) : void
	{
		this.skillTree.ActivateSubClass(subClassId);
		this.StoreBuildInHash();
		this.treeView.Invalidate();
	}

	private OnImportBuild(url : string) : void
	{
		try
		{
			var segments = URI(url).segment();
			this.skillTree.CreateBuild(Immutable.List<number>(TreeConverter.Decode(segments[segments.length - 1])));
			this.treeView.CenterOnActiveClass();
			this.StoreBuildInHash();
		}
		catch (error)
		{
			this.acitonBar.LoadFailed();
		}
	}

	private OnBuildChanged() : void
	{
		this.StoreBuildInHash();
	}

	private OnTreeInitialized(skillTree : SkillTree) : void
	{
		this.skillTree = skillTree;

		try
		{
			var hash = this.getHash(window.location.hash);
			this.lastKnownHash = hash;

			if (hash == null || hash.length == 0)
			{
				this.skillTree.ActivateClass(0);
			}
			else
			{
				this.skillTree.CreateBuild(Immutable.List<number>(TreeConverter.Decode(hash)));
			}
		}
		catch (e)
		{
			this.skillTree.ActivateClass(0);
		}

		this.zone.onStable.first().subscribe(() =>
		{
			this.buildSummary.OnNodesChanged();
		});
	}

	private StoreBuildInHash() : void
	{
		var nodeIdsInBuild = this.skillTree.Nodes.filter(n => n.State == NodeState.Active && n.NodeType != NodeType.Class).map(n => n.Id);
		var classNode = this.skillTree.Nodes.find(n => n.State == NodeState.Active && n.NodeType == NodeType.Class);
		var className = ParsingConstants.NodeIdToClass[classNode.Id];
		var classId = ParsingConstants.ClassNameToIdentifier[className];
		var encodedBuild = TreeConverter.Encode(classId, nodeIdsInBuild.toArray());
		this.lastKnownHash = encodedBuild;
		window.location.hash = encodedBuild;
		this.buildSummary.OnNodesChanged();
	}

	private getHash(url : string) : string
	{
		var hash = URI(url).hash();
		if (hash.length > 0 && hash[0] == "#") hash = hash.substr(1);
		return hash;
	}
}
