import { Rectangle } from "./../shared/rectangle";
import { Browser } from "./../shared/browser";
import { SkillTree } from "./../shared/model/skilltree";
import { Node } from "./../shared/model/node";
import { SkillTreeGraphRenderer } from "./treerenderer.service";
import { Point } from "./../shared/point";
import {Component, EventEmitter, Input, Output, NgZone} from "@angular/core";
import * as Rx from "rxjs/Rx";
import * as Immutable from "immutable";

@Component(
{
	selector: "poe-tree-view",
	templateUrl: "treeview.template.html"
})
export class TreeView
{
	public MouseWheels : Rx.Observable<any>;
	public LocalMouseMoves : Rx.Observable<Point>;
	public LocalMouseUps : Rx.Observable<Point>;
	public LocalMouseDowns : Rx.Observable<Point>;
	public RelativeGlobalMouseMoves : Rx.Observable<Point>;
	private graphRenderer : SkillTreeGraphRenderer;
	@Input("width") canvasWidth : number;
	@Input("height") canvasHeight : number;
	@Input("skill-tree") skillTree : SkillTree;
	@Output("nodehover") hoverEvent : EventEmitter<Immutable.List<Node>>;
	@Output("nodetoggle") nodeToggleEvent : EventEmitter<any>;

	public constructor(private browser : Browser, private zone : NgZone)
	{
		this.LocalMouseDowns = new Rx.Subject<MouseEvent>().map(e => new Point(e.offsetX, e.offsetY));
		this.LocalMouseUps = new Rx.Subject<MouseEvent>().map(e => new Point(e.offsetX, e.offsetY));
		this.MouseWheels = new Rx.Subject<MouseEvent>();
		this.LocalMouseMoves = new Rx.Subject<MouseEvent>().map(e => new Point(e.offsetX, e.offsetY));
		this.RelativeGlobalMouseMoves = Rx.Observable.fromEvent<MouseEvent>(window, "mousemove").map(e => new Point(e.offsetX, e.offsetY));
		this.hoverEvent = new EventEmitter<Immutable.List<Node>>();
		this.nodeToggleEvent = new EventEmitter();
	}

	public ngAfterViewInit() : void
	{
		Rx.Observable.fromEvent<any>(document, "touchmove")
			.filter(e => e.target.tagName.toLowerCase() == "canvas")
			.subscribe(e => e.preventDefault());

		var canvasElement : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("skillTreeCanvas");
		var canvasContext = canvasElement.getContext("2d");
		this.graphRenderer = new SkillTreeGraphRenderer(canvasContext, this.skillTree);
		this.CenterOnActiveClass();

		this.DragEventSequence.subscribe((p : Point) =>
		{
			this.graphRenderer.SlideBy(p.X, p.Y);
		});

		this.ClickEventSequence.subscribe((clickPoint : Point) =>
		{
			var clickedNodes = this.graphRenderer.TopNodeAt(clickPoint);
			if (clickedNodes.isEmpty()) return;
			this.skillTree.ToggleNodes(clickedNodes);
			this.nodeToggleEvent.next(null);
			this.graphRenderer.Invalidate();
		});

		this.NodeHoverChangeSequence(this.graphRenderer).subscribe((changeSets : Array<Immutable.List<Node>>) =>
		{
			this.skillTree.ClearHighlighting();
			changeSets[0].forEach(n => n.Hovered = false);
			changeSets[1].forEach(n => n.Hovered = true);
			if (!changeSets[1].isEmpty()) this.skillTree.HighlightPathToNode(changeSets[1]);
			this.hoverEvent.emit(changeSets[1]);
			this.graphRenderer.Invalidate();
		});

		this.MouseWheels.subscribe((e : any) =>
		{
			var cursorPosition = new Point(e.offsetX, e.offsetY);
			e["deltaY"] < 0 ? this.graphRenderer.IncrementZoomLevel(cursorPosition) : this.graphRenderer.DecrementZoomlevel(cursorPosition);
		});
	}

	public Invalidate() : void
	{
		this.graphRenderer.Invalidate();
	}

	public CenterOnActiveClass() : void
	{
		this.graphRenderer.CenterAtPoint(this.skillTree.ActiveClassNode.CenterPoint);
	}

	private NodeHoverChangeSequence(renderer : SkillTreeGraphRenderer) : Rx.Observable<Array<Immutable.List<Node>>>
	{
		return this.LocalMouseMoves
			.map(p => renderer.TopNodeAt(p))
			.bufferCount(2, 1)
			.filter(change => change.length > 1)
			.filter(change => !change[0].equals(change[1]));
	}

	private get ClickEventSequence() : Rx.Observable<any>
	{
		return this.LocalMouseDowns.flatMap(downPoint =>
			this.LocalMouseUps
				.filter(upPoint => new Rectangle(upPoint.X - 5, upPoint.Y - 5, 10, 10).IsPointInside(downPoint))
				.first());
	}

	private get DragEventSequence() : Rx.Observable<any>
	{
		return this.LocalMouseDowns.flatMap(downPoint =>
			this.browser.GlobalMouseMove.takeUntil(this.browser.GlobalMouseUp)
				.bufferCount(2, 1)
				.filter(allPoints => allPoints.length > 1)
				.map(allPoints => new Point(allPoints[allPoints.length-1].X - allPoints[0].X, allPoints[allPoints.length-1].Y - allPoints[0].Y)));
	}
}
