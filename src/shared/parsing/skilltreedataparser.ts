import { Connection } from "./../model/connection";
import {AscendancyClassSpec} from "../model/ascendancyclassspec";
import {ClassSpec} from "../model/classspec";
import {GroupType, ImageType, NodeState, NodeType} from "../model/enums";
import {Group} from "../model/group";
import {Node} from "../model/node";
import {NodeDetail} from "../model/nodedetail";
import {SkillTree} from "../model/skilltree";
import {SkillTreeImage} from "../model/skilltreeimage";
import {Point} from "../point";
import {Size} from "../size";
import {ImageParser} from "./imageparser";
import {ParsingConstants} from "./parsingconstants";
import * as Immutable from "immutable";

export class SkillTreeDataParser
{
	private imageParser : ImageParser;

	public constructor(private _skillTreeData : any, private _ascendancyClassData : any)
	{
		this.imageParser = new ImageParser(_skillTreeData);
	}

	public Parse() : Promise<SkillTree>
	{
		var skillTree : SkillTree = new SkillTree();
		skillTree.ClassSpecs = this.ParseClassSpecs();
		skillTree.Groups = this.ParseGroups();
		skillTree.Nodes = Immutable.List(this.ParseNodes(skillTree));
		skillTree.Connections = this.ParseConnections(skillTree);
		skillTree.Location = new Point(this._skillTreeData.min_x, this._skillTreeData.min_y);
		skillTree.Size = new Size(this._skillTreeData.max_x - this._skillTreeData.min_x, this._skillTreeData.max_y - this._skillTreeData.min_y);
		skillTree.Assets = Immutable.Map<string, SkillTreeImage>();

		var assets = Immutable.Map<string, any>(this._skillTreeData.assets);
		var assetUrls = assets.valueSeq().map(v => v[ParsingConstants.highestResolutionZoomFactor]).filter(x => x != null && x.length > 0).toList();

		var groupsAndNodesImages = skillTree.Nodes
			.flatMap(n => n.ImagesForState.valueSeq()).flatMap(i => i)
			.concat(skillTree.Groups.flatMap(g => g.Images))
			.filter(i => i.Url.length > 0);

		var assetImages = assetUrls
			.map(url => { var i = new SkillTreeImage(); i.Url = url; i.Type = ImageType.File; return i; })
			.valueSeq();

		assetImages.forEach(i =>
		{
			var assetName = assets.findKey(v => v[ParsingConstants.highestResolutionZoomFactor] == i.Url);
			skillTree.Assets = skillTree.Assets.set(assetName, i);
		});

		return Promise.all(
			groupsAndNodesImages
				.concat(assetImages)
				.map(i => i.LoadImage())
				.toArray())
			.then(() => this.translateAscendancyGroupsAndNodes(skillTree))
			.then(() => skillTree);
	}

	private ParseClassSpecs() : Immutable.List<ClassSpec>
	{
		var result = Immutable.List<ClassSpec>();

		for (var classId in this._ascendancyClassData)
		{
			var classSpec = new ClassSpec();
			classSpec.BaseClassId = parseInt(classId);
			classSpec.BaseClassName = this._ascendancyClassData[classId].name;

			for (var subclassId in this._ascendancyClassData[classId].classes)
			{
				var subclassSpec = new AscendancyClassSpec();
				subclassSpec.Id = parseInt(subclassId);
				subclassSpec.Name = this._ascendancyClassData[classId].classes[subclassId].name;
				subclassSpec.DisplayName = this._ascendancyClassData[classId].classes[subclassId].displayName;

				classSpec.SubClasses = classSpec.SubClasses.concat(subclassSpec).toList();
			}

			result = result.concat(classSpec).toList();
		}

		return result;
	}

	private DetermineNodeType(nodeData : any) : NodeType
	{
		if (nodeData["isJewelSocket"]) return NodeType.Jewel;
		if (nodeData.m) return NodeType.Mastery;
		if (nodeData.ks) return NodeType.Keystone;
		if (nodeData.not) return NodeType.Notable;
		if (this._skillTreeData.root.out.indexOf(nodeData.id) != -1) return NodeType.Class;
		return NodeType.Simple;
	}

	private ParseNodes(skillTree : SkillTree) : Array<Node>
	{
		var nodes = new Array<Node>();

		for (var nodeData of this._skillTreeData.nodes)
		{
			var group = skillTree.Groups.find(g => g.Id == <number> nodeData.g);
			var radius = ParsingConstants.SkillDistancesFromGroupCenter[nodeData.o];
			var radian = 2 * Math.PI * nodeData.oidx / ParsingConstants.MaxNumSkillsInGroupForDistance[nodeData.o];
			var x = group.Location.X - (radius * Math.sin(-radian));
			var y = group.Location.Y - (radius * Math.cos(-radian));
			var nodeType = this.DetermineNodeType(nodeData);

			var nodeModel = new Node();
			nodeModel.Id = nodeData.id;
			nodeModel.Group = group;
			nodeModel.CenterPoint = new Point(x, y);
			nodeModel.Radius = radius;
			nodeModel.Radian = radian;
			nodeModel.State = NodeState.Inactive;
			nodeModel.NodeType = nodeType;
			nodeModel.Name = nodeData.dn;
			nodeModel.Details = Immutable.List<NodeDetail>().toArray();
			nodeModel.IsAscendancyStart = nodeData.isAscendancyStart;
			nodeModel.AscendancyName = nodeData.ascendancyName;

			this.ParseNodeDetails(nodeModel, nodeData);

			if (nodeType == NodeType.Jewel) this.imageParser.ParseJewelAssets(nodeData, nodeModel);
			if (nodeType == NodeType.Class)	this.imageParser.ParseClassNodeAssets(nodeData, nodeModel);
			if (nodeType == NodeType.Keystone) this.imageParser.ParseKeystoneNodeAssets(nodeData, nodeModel);
			if (nodeType == NodeType.Mastery) this.imageParser.ParseMasteryNodeAssets(nodeData, nodeModel);
			if (nodeType == NodeType.Notable) this.imageParser.ParseNotableNodeAssets(nodeData, nodeModel);
			if (nodeType == NodeType.Simple) this.imageParser.ParseSimpleNodeAssets(nodeData, nodeModel);

			nodes.push(nodeModel);
		}

		return nodes;
	}

	private translateAscendancyGroupsAndNodes(skillTree : SkillTree)
	{
		skillTree.Groups.filter(g => g.GroupType == GroupType.Ascendancy).forEach(g =>
		{
			var nodesInGroup = skillTree.Nodes.filter(n => n.Group.Id == g.Id);
			var subclassName = nodesInGroup.first().AscendancyName;
			var ascendancyStartNode = skillTree.Nodes.find(n => n.IsAscendancyStart && n.AscendancyName == subclassName);
			var translateXAmount = g.Location.X - ascendancyStartNode.CenterPoint.X;
			var translateYAmount = g.Location.Y - ascendancyStartNode.CenterPoint.Y;

			var imagePoint = skillTree.CalculateAscendancyClassCenterPoint(subclassName);
			g.Location = new Point(imagePoint.X + translateXAmount, imagePoint.Y + translateYAmount);
		});

		skillTree.Nodes.filter(n => n.AscendancyName != null).forEach(n =>
		{
			n.CenterPoint.X = n.Group.Location.X - (n.Radius * Math.sin(-n.Radian));
			n.CenterPoint.Y = n.Group.Location.Y - (n.Radius * Math.cos(-n.Radian));
			return true;
		});
	};

	private ParseNodeDetails(node : Node, nodeData : any) : void
	{
		var textDetails = nodeData.sd;

		if (node.NodeType == NodeType.Class)
		{
			var internalClassName = ParsingConstants.NodeIdToClass[node.Id];
			var classIndex = ParsingConstants.ClassNameToIdentifier[internalClassName];
			var classAttributes = this._skillTreeData.characterData[classIndex];

			textDetails = [];
			textDetails.push(classAttributes.base_str + " Base Strength");
			textDetails.push(classAttributes.base_dex + " Base Dexterity");
			textDetails.push(classAttributes.base_int + " Base Intelligence");
		}
		else if (node.NodeType == NodeType.Jewel)
		{
			textDetails = ["+1 jewel sockets"];
		}
		else if (node.Name == "Passive Point")
		{
			textDetails = ["+1 passive points"];
		}

		for (var i=0; i<textDetails.length; i++)
		{
			node.Details.push(this.ParseNodeDetail(node, textDetails[i]));
		}
	}

	private ParseNodeDetail(node : Node, text : string) : NodeDetail
	{
		var category = "misc";
		var lowercaseText = text.toLowerCase();
		var keywords = ParsingConstants.KeywordToCategoryMapping.keySeq();
		var matchingKeyword = keywords.find(keyword => lowercaseText.indexOf(keyword) != -1);
		if (matchingKeyword) category = ParsingConstants.KeywordToCategoryMapping.get(matchingKeyword);
		if (node.NodeType == NodeType.Keystone) category = "keystonejewel";

		var amount = 0;
		var numberRegex = /\d+\.*\d*/;
		var numberMatches = numberRegex.exec(text);
		if (numberMatches && numberMatches.length > 0) amount = parseFloat(numberMatches[0]);

		var detail = new NodeDetail();
		detail.Text = text;
		detail.Amount = amount;
		detail.Category = category;
		detail.TemplatedText = text.replace(numberRegex, "#");
		detail.Keyword = matchingKeyword;

		return detail;
	}

	private ParseGroups() : Immutable.List<Group>
	{
		var groups = new Array<Group>();
		var allNodes = Immutable.List<any>(this._skillTreeData.nodes);

		for (var index in this._skillTreeData.groups)
		{
			var g = this._skillTreeData.groups[index];

			if (g.n.length == 0) continue;

			var nodeInGroupId = Immutable.List<number>(g.n).first();
			var nodeInGroup = allNodes.find(n => n.id == nodeInGroupId);

			var group = new Group();
			group.Id = parseInt(index);
			group.Location = new Point(g.x, g.y);
			group.GroupType = nodeInGroup["ascendancyName"] ? GroupType.Ascendancy : GroupType.Normal;
			group.Images = this.imageParser.ParseGroupBackground(g);
			groups.push(group);
		}

		return Immutable.List(groups);
	}

	private ParseConnections(skillTree : SkillTree) : Immutable.List<Connection>
	{
		var allConnections = new Array<Connection>();

		for (var node of this._skillTreeData.nodes)
		{
			var connectionIds = Immutable.List<number>(node.out);
			var from = skillTree.GetNodeById(node.id);
			var to = skillTree.GetNodesByIds(connectionIds);

			to.forEach(cn => from.ConnectedNodes = from.ConnectedNodes.push(cn));
			to.forEach(toNode => toNode.ConnectedNodes = toNode.ConnectedNodes.push(from));
			to.map(n => new Connection(from, n)).forEach(c => allConnections.push(c));
		}

		return Immutable.List(allConnections);
	}
}
