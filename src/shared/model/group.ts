import { SkillTreeImage } from "./skilltreeimage";
import {Point} from "../point";
import {GroupType} from "./enums";
import * as Immutable from "immutable";

export class Group
{
	public Id : number;
	public Location : Point;
	public Images : Immutable.List<SkillTreeImage>;
	public GroupType : GroupType;

	public constructor()
	{
		this.Images = Immutable.List<SkillTreeImage>();
		this.GroupType= GroupType.Normal;
	}
}