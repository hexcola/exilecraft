import { Group } from "./group";
import { Connection } from "./connection";
import {Node} from "./node";
import { Tuple } from "./../tuple";
import {NodeType} from "./enums";
import {ParsingConstants} from "../parsing/parsingconstants";
import {ClassSpec} from "./classspec";
import {AscendancyClassSpec} from "./ascendancyclassspec";
import {NodeState} from "./enums";
import {SkillTreeImage} from "./skilltreeimage";
import {Size} from "../size";
import {Point} from "../point";
import * as Immutable from "immutable";

export class SkillTree
{
	public Nodes : Immutable.List<Node>;
	public Connections : Immutable.List<Connection>;
	public Location : Point;
	public Size : Size;
	public Groups : Immutable.List<Group>;
	public Assets : Immutable.Map<string, SkillTreeImage>;
	public ClassSpecs : Immutable.List<ClassSpec>;
	public IsAscendancyClassVisible : boolean;

	public constructor()
	{
		this.Assets = Immutable.Map<string, SkillTreeImage>();
		this.ClassSpecs = Immutable.List<ClassSpec>();
	}

	public get AscendancyClassImage() : SkillTreeImage
	{
		return this.Assets.get("Classes" + this.SelectedSubClass.Name);
	}

	public get SpentPoints() : number
	{
		return this.Nodes.filter(n => n.IsSkill && n.State == NodeState.Active && n.AscendancyName == null).count()
	}

	public get SpentAscendancyPoints() : number
	{
		return this.Nodes.filter(n => !n.IsAscendancyStart && n.State == NodeState.Active && n.AscendancyName != null).count()
	}

	public get SelectedSubClass() : AscendancyClassSpec
	{
		var name = this.Nodes.filter(n => n.IsAscendancyStart && n.State == NodeState.Active).first().AscendancyName;
		return this.SelectedClass.SubClasses.find(c => c.Name == name);
	}

	public get SelectedClass() : ClassSpec
	{
		var classNode = this.Nodes.filter(n => n.NodeType == NodeType.Class && n.State == NodeState.Active).first();
		var internalClassName = ParsingConstants.NodeIdToClass[classNode.Id];
		var id = ParsingConstants.ClassNameToIdentifier[internalClassName];
		return this.ClassSpecs.find(c => c.BaseClassId == id);
	}

	public get ActiveClassNode() : Node
	{
		return this.Nodes.find(n => n.NodeType == NodeType.Class && n.State == NodeState.Active);
	}

	public GetNodeById(id : number) : Node
	{
		return this.Nodes.find(n => n.Id == id);
	}

	public GetNodesByIds(ids : Immutable.List<number>) : Immutable.List<Node>
	{
		return ids.map(id => this.GetNodeById(id)).toList();
	}

	public CreateBuild(nodeIds : Immutable.List<number>) : void
	{
		var nodes = nodeIds.map(id => this.Nodes.find(n => n.Id == id));
		this.ResetNodes();
		nodes.forEach(n => { n.State = NodeState.Active; return true; });
	}

	public CalculateAscendancyClassCenterPoint(subclassName : string) : Point
	{
		var classSpec = this.ClassSpecs.find(c => c.SubClasses.count(sc => sc.Name == subclassName) > 0);
		var classInternalName = ParsingConstants.ClassIdentifierToName[classSpec.BaseClassId];
		var classNodeId = ParsingConstants.ClassToNodeId[classInternalName];
		var classNode = this.Nodes.find(cn => cn.Id == classNodeId);
		var isCenterClass = Math.abs(classNode.Group.Location.X) < 10.0 && Math.abs(classNode.Group.Location.Y) < 10.0;
		var rotationAmount = 0;

		if (!isCenterClass)
		{
			var distToCenter = Math.sqrt(classNode.Group.Location.X * classNode.Group.Location.X + classNode.Group.Location.Y * classNode.Group.Location.Y);
			rotationAmount = Math.atan2(classNode.Group.Location.X / distToCenter, -classNode.Group.Location.Y / distToCenter);
		}

		var image = this.Assets.get("Classes" + subclassName);
		var imageCX = classNode.Group.Location.X + (270 + image.Size.Width/2) * Math.cos(rotationAmount + Math.PI/2);
		var imageCY = classNode.Group.Location.Y + (270 + image.Size.Height/2) * Math.sin(rotationAmount + Math.PI/2);
		return new Point(imageCX, imageCY);
	}

	public IsPointUnderAscendancyBackground(p : Point) : boolean
	{
		var centerPoint = this.CalculateAscendancyClassCenterPoint(this.SelectedSubClass.Name);
		var distanceAway = Math.sqrt(Math.pow(p.X - centerPoint.X, 2) + Math.pow(p.Y - centerPoint.Y, 2));
		var image = this.Assets.get("Classes" + this.SelectedSubClass.Name);
		var radius = image.Size.Width / 2;
		return distanceAway < radius;
	}

	public ResetNodes() : void
	{
		this.Nodes.forEach(n => { n.State = NodeState.Inactive; return true; });
	}

	public ActivateClass(classId : number) : void
	{
		this.ResetNodes();
		var classInternalName = ParsingConstants.ClassIdentifierToName[classId];
		var classNodeId = ParsingConstants.ClassToNodeId[classInternalName];
		this.Nodes.find(n => n.Id == classNodeId).State = NodeState.Active;
		this.ActivateSubClass(1);
	}

	public ActivateSubClass(subClassId : number) : void
	{
		var classSpec = this.SelectedClass;
		var subClassSpec = classSpec.SubClasses.find(c => c.Id == subClassId);
		this.Nodes.filter(n => n.AscendancyName != null).forEach(n => { n.State = NodeState.Inactive; return true; });
		this.Nodes.find(n => n.IsAscendancyStart && n.AscendancyName == subClassSpec.Name).State = NodeState.Active;
	}

	public ToggleNodes(nodes : Immutable.List<Node>) : void
	{
		this.ClearHighlighting();

		if (nodes.count(n => n.NodeType == NodeType.Class && n.State == NodeState.Active) > 0 && nodes.count() == 1)
		{
			this.IsAscendancyClassVisible = !this.IsAscendancyClassVisible;
		}

		nodes.filter(n => n.IsSkill).forEach(node =>
		{
			if (node.State == NodeState.Active)
			{
				node.State = NodeState.Inactive;
				this.FindOrphanedNodes().forEach(n => { n.State = NodeState.Inactive; return true; });
			}
			else
			{
				Immutable.List(this.FindShortestPathToInactiveNode(node)).forEach(n => { n.State = NodeState.Active; return true; });
			}
		});
	}

	public HighlightSearchMatches(query : string) : void
	{
		query = query.toLowerCase();
		this.Nodes.forEach(n => { n.IsSearchHighlighted = false; return true; });

		if (query.length == 0) return;

		this.Nodes.filter(n => n.IsSkill).forEach(n =>
		{
			n.IsSearchHighlighted = n.Details.some(d => d.Text.toLowerCase().indexOf(query) != -1);
			return true;
		});
	}

	public HighlightPathToNode(nodes : Immutable.List<Node>) : void
	{
		var validNodes = nodes.filter(n => n.IsSkill);
		if (validNodes.isEmpty()) return;
		var targetNode = validNodes.first();

		if (targetNode.State == NodeState.Active)
		{
			targetNode.State = NodeState.Inactive;
			this.FindOrphanedNodes().forEach(highlightedNode => highlightedNode.IsOrphanHighlighted = true);
			targetNode.State = NodeState.Active;
			targetNode.IsOrphanHighlighted = true;
		}
		else
		{
			var highlightedPath = this.FindShortestPathToInactiveNode(targetNode);
			highlightedPath.forEach(highlightedNode => highlightedNode.IsHighlighted = true);
		}
	}

	public ClearHighlighting() : void
	{
		this.Nodes.forEach(x =>
		{
			x.IsHighlighted = false;
			x.IsOrphanHighlighted = false;
			return true;
		});
	}

	private FindOrphanedNodes() : Immutable.Iterable<number, Node>
	{
		var classNode = this.Nodes.find(n => n.NodeType == NodeType.Class && n.State == NodeState.Active);
		var checkedNodes = Immutable.Repeat(false, this.Nodes.max(n => n.Id).Id).toMap().set(classNode.Id, true);
		var nonOrphanedNodes = Immutable.List<Node>().push(classNode);
		var nodesToCheckQueue = <Immutable.Iterable<number, Node>> classNode.ConnectedNodes;

		while (!nodesToCheckQueue.isEmpty())
		{
			var currentNode = nodesToCheckQueue.last();
			nodesToCheckQueue = nodesToCheckQueue.butLast();

			if (checkedNodes.get(currentNode.Id)) continue;
			checkedNodes = checkedNodes.set(currentNode.Id, true);
			if (currentNode.State == NodeState.Inactive) continue;
			nonOrphanedNodes = nonOrphanedNodes.push(currentNode);
			nodesToCheckQueue = nodesToCheckQueue.concat(currentNode.ConnectedNodes);
		}

		return this.Nodes.filter(n => n.State == NodeState.Active).filter(n => !nonOrphanedNodes.contains(n));
	}

	public FindShortestPathToInactiveNode(targetNode : Node) : Immutable.List<Node>
	{
		var nodesAtCurrentDepth = this.Nodes.filter(n => n.State == NodeState.Active)
			.flatMap(activeNode => activeNode.ConnectedNodes.filter(cn => cn.State == NodeState.Inactive)
				.map(connectedNode => new Tuple(connectedNode, Immutable.List<Node>([connectedNode]))));

		var subclassName = this.SelectedSubClass.Name;
		var nodesAtNextDepth = new Array<Tuple<Node, Immutable.List<Node>>>();
		var checkedNodes = Immutable.Repeat(false, this.Nodes.max(n => n.Id).Id).toMap();
		var result = Immutable.List<Node>();

		while (!nodesAtCurrentDepth.isEmpty() && result.isEmpty())
		{
			nodesAtCurrentDepth.forEach(current =>
			{
				var currentNode = current.Item1;
				var currentPath = current.Item2;

				checkedNodes = checkedNodes.set(currentNode.Id, true);
				if (currentNode.NodeType == NodeType.Class) return;
				if (currentNode.Id == targetNode.Id) result = currentPath;

				currentNode.ConnectedNodes
					.filter(cn => !checkedNodes.get(cn.Id))
					.filter(cn => cn.AscendancyName == currentNode.AscendancyName)
					.forEach(cn => nodesAtNextDepth.push(new Tuple(cn, currentPath.push(cn))));
			});

			nodesAtCurrentDepth = Immutable.List(nodesAtNextDepth);
			nodesAtNextDepth = [];
		}

		return Immutable.List(result);
	}
}
