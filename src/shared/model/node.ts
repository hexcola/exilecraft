import { SkillTreeImage } from "./skilltreeimage";
import {NodeDetail} from "./nodedetail";
import {Group} from "./group";
import {GroupType, NodeState, NodeType} from "./enums";
import {Point} from "../point";
import * as Immutable from "immutable";

export class Node
{
	public Id : number;
	public CenterPoint : Point;
	public Group : Group;
	public Radian : number;
	public Radius : number;
	public State : NodeState;
	public ImagesForState : Immutable.Map<NodeState, Immutable.List<SkillTreeImage>>;
	public NodeType : NodeType;
	public Name : string;
	public ConnectedNodes : Immutable.List<Node>;
	public IsHighlighted : boolean;
	public IsOrphanHighlighted : boolean;
	public IsSearchHighlighted : boolean;
	public Hovered : boolean;
	public Details : Array<NodeDetail>;
	public IsAscendancyStart : boolean;
	public AscendancyName : string;

	public constructor()
	{
		this.ConnectedNodes = Immutable.List<Node>();
		this.ImagesForState = Immutable.Map<NodeState, Immutable.List<SkillTreeImage>>();
		this.Details = new Array<NodeDetail>();
	}

	public get IsSkill()
	{
		return this.NodeType != NodeType.Class && this.NodeType != NodeType.Mastery;
	}
}