import {NodeState} from "./enums";
import {Node} from "./node";

export class Connection
{
	public constructor(public A : Node, public B : Node)
	{

	}

	public AreSame(other : Connection) : boolean
	{
		return this.A == other.A && this.B == other.B
			|| this.A == other.B && this.B == other.A;
	}

	public get IsHighlightedAsOrphan()
	{
		return this.A.IsOrphanHighlighted && this.B.IsOrphanHighlighted
			|| this.A.IsOrphanHighlighted && this.B.State == NodeState.Active
			|| this.B.IsOrphanHighlighted && this.A.State == NodeState.Active;
	}

	public get IsHighlightedForActivation()
	{
		return this.A.IsHighlighted && this.B.IsHighlighted
			|| this.A.IsHighlighted && this.B.State == NodeState.Active
			|| this.B.IsHighlighted && this.A.State == NodeState.Active;
	}

	public get IsActive()
	{
		return this.A.State == NodeState.Active && this.B.State == NodeState.Active;
	}
}