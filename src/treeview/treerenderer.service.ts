import {Node} from "../shared/model/node";
import {Connection} from "../shared/model/connection";
import {Rectangle} from "../shared/rectangle";
import {SkillTreeImage} from "../shared/model/skilltreeimage";
import {Tuple} from "../shared/tuple";
import {ImageType} from "../shared/model/enums";
import {GroupType} from "../shared/model/enums";
import {ImageLayer} from "../shared/model/enums";
import {NodeType} from "../shared/model/enums";
import {Point} from "../shared/point";
import {SkillTree} from "../shared/model/skilltree";
import {NgZone} from "@angular/core";
import * as Immutable from "immutable";

export class SkillTreeGraphRenderer
{
	private zoomFactor : number;
	private screenOffsetX : number;
	private screenOffsetY : number;
	private invalidated : boolean;

	private static jewelRadii : Array<number> = [800, 1200, 1500];
	private static jewelCircleThickness = 10;

	public constructor(private context : CanvasRenderingContext2D, private skillTree : SkillTree)
	{
		this.zoomFactor = .2;
		this.screenOffsetX = 0;
		this.screenOffsetY = 0;
	}

	public CenterAtPoint(graphPoint : Point) : void
	{
		var centerX = -graphPoint.X * this.zoomFactor;
		var centerY = -graphPoint.Y * this.zoomFactor;
		this.screenOffsetX = centerX + this.context.canvas.width / 2;
		this.screenOffsetY = centerY + this.context.canvas.height / 2;
		this.Invalidate();
	}

	public IncrementZoomLevel(screenPoint : Point) : void
	{
		if (this.zoomFactor > .3) return;

		var graphPoint = this.convertToGraphPoint(screenPoint);
		this.zoomFactor += .03;
		this.screenOffsetX += -graphPoint.X * .03;
		this.screenOffsetY += -graphPoint.Y * .03;
		this.Invalidate();
	}

	public DecrementZoomlevel(screenPoint : Point) : void
	{
		if (this.zoomFactor < .1) return;

		var graphPoint = this.convertToGraphPoint(screenPoint);
		this.zoomFactor -= .03;
		this.screenOffsetX += -graphPoint.X * -.03;
		this.screenOffsetY += -graphPoint.Y * -.03;
		this.Invalidate();
	}

	public SlideBy(xAmount : number, yAmount : number) : void
	{
		this.screenOffsetX += xAmount;
		this.screenOffsetY += yAmount;
		this.Invalidate();
	}

	public Invalidate() : void
	{
		if (this.invalidated) return;
		this.invalidated = true;

		requestAnimationFrame(() =>
		{
			this.renderInternal();
			this.invalidated = false;
		});
	}

	public TopNodeAt(screenPoint : Point) : Immutable.List<Node>
	{
		var nodesAtPoint = this.NodesAt(screenPoint);

		nodesAtPoint = nodesAtPoint.filter(n => !n.IsAscendancyStart && n.NodeType != NodeType.Mastery).toList();

		if (nodesAtPoint.isEmpty()) return nodesAtPoint;

		if (this.skillTree.IsAscendancyClassVisible)
		{
			var subclassName = this.skillTree.SelectedSubClass.Name;
			var ascendancyNode = nodesAtPoint.find(n => n.AscendancyName == subclassName);
			if (ascendancyNode != null) return Immutable.List<Node>().concat(ascendancyNode).toList();
			nodesAtPoint = nodesAtPoint.filter(n => !this.skillTree.IsPointUnderAscendancyBackground(this.convertToGraphPoint(screenPoint))).toList();
		}

		nodesAtPoint = nodesAtPoint.filter(n => n.AscendancyName == null).toList();

		if (nodesAtPoint.isEmpty()) return nodesAtPoint;

		var smallestNode = nodesAtPoint.sortBy(n =>
		{
			var biggestImage = n.ImagesForState.get(n.State).max(i => i.Size.Height * i.Size.Width);
			return biggestImage.Size.Height * biggestImage.Size.Width;
		}).first();

		return Immutable.List<Node>().concat(smallestNode).toList();
	}

	public NodesAt(screenPoint : Point) : Immutable.List<Node>
	{
		var foundNodes = new Array<Node>(5000);
		var numNodesFound = 0;

		this.skillTree.Nodes.filter(n => !n.ImagesForState.isEmpty()).forEach(n =>
		{
			var nodeIsUnderPoint = n.ImagesForState.get(n.State)
				.some(i => this.createRectangleAroundPoint(n.CenterPoint, i).IsPointInside(screenPoint));

			if (nodeIsUnderPoint) foundNodes[numNodesFound++] = n;
		});

		foundNodes.length = numNodesFound;
		return Immutable.List<Node>(foundNodes);
	}

	private renderInternal() : void
	{
		this.context.canvas.width = this.context.canvas.width;
		this.renderPassiveTree();
		this.renderAscendancyTree();
	}

	private renderAscendancyTree() : void
	{
		if (!this.skillTree.IsAscendancyClassVisible) return;

		var subclassName = this.skillTree.SelectedSubClass.Name;
		var centerOfTree = this.skillTree.CalculateAscendancyClassCenterPoint(subclassName);
		var ascendancyNodes = this.skillTree.Nodes.filter(n => n.AscendancyName == subclassName);
		var nodesToRender = this.findNodeImagesToRender(ascendancyNodes);
		var ascendancyTreeConnections = this.skillTree.Connections.filter(c => c.A.AscendancyName != null && c.B.AscendancyName != null && c.A.AscendancyName == subclassName);

		this.renderImage(this.skillTree.AscendancyClassImage, this.createRectangleAroundPoint(centerOfTree, this.skillTree.AscendancyClassImage));
		this.renderImagesOnLayer(nodesToRender, ImageLayer.Background);
		this.renderTreeConnections(ascendancyTreeConnections);
		this.renderImagesOnLayer(nodesToRender, ImageLayer.Icon);
		this.renderImagesOnLayer(nodesToRender, ImageLayer.Frame);
		this.renderSearchHighlighting(ascendancyNodes);
	}

	private renderPassiveTree() : void
	{
		var passiveTreeNodes = this.skillTree.Nodes.filter(n => n.AscendancyName == null);
		var allImages = this.findNodeImagesToRender(passiveTreeNodes);

		this.renderPassiveTreeGroups();
		this.renderImagesOnLayer(allImages, ImageLayer.Background);
		this.renderTreeConnections(this.skillTree.Connections.filter(c => c.A.IsSkill && c.B.IsSkill && c.A.AscendancyName == null));
		this.renderImagesOnLayer(allImages, ImageLayer.Icon);
		this.renderImagesOnLayer(allImages, ImageLayer.Frame);
		this.renderSearchHighlighting(passiveTreeNodes);
		this.renderJewelRadii();
	}

	private renderPassiveTreeGroups() : void
	{
		this.skillTree.Groups.filter(g => g.GroupType == GroupType.Normal).forEach(g =>
		{
			g.Images.forEach(i =>
			{
				this.renderImage(i, this.createRectangleAroundPoint(g.Location, i))
			});
		});
	}

	private renderTreeConnections(connections : Immutable.Iterable<number, Connection>) : void
	{
		var orphanHighlighted = connections.filter(c => c.IsHighlightedAsOrphan);
		var activationHighlighted = connections.filter(c => c.IsHighlightedForActivation);
		var active = connections.filter(c => c.IsActive && !c.IsHighlightedAsOrphan);
		var inactive = connections.filter(c => !c.IsActive && !c.IsHighlightedForActivation);

		this.renderConnectionType(orphanHighlighted, "rgba(255, 0, 0, .6)", 40 * this.zoomFactor);
		this.renderConnectionType(activationHighlighted, "rgba(0, 255, 0, .6)", 40 * this.zoomFactor);
		this.renderConnectionType(active, "#7d7c03", 30 * this.zoomFactor);
		this.renderConnectionType(inactive, "#3D3C1B", 20 * this.zoomFactor);
	}

	private renderJewelRadii() : void
	{
		var hoveredJewelSockets = this.skillTree.Nodes.filter(n => n.Hovered && n.NodeType == NodeType.Jewel);

		hoveredJewelSockets.forEach(n =>
		{
			var screenPoint = this.convertToScreenPoint(n.CenterPoint);

			SkillTreeGraphRenderer.jewelRadii.forEach(radius =>
			{
				this.context.beginPath();
				this.context.arc(screenPoint.X, screenPoint.Y, (radius - SkillTreeGraphRenderer.jewelCircleThickness / 2) * this.zoomFactor, 0, Math.PI * 2);
				this.context.strokeStyle = "rgb(255, 255, 255)";
				this.context.lineWidth = SkillTreeGraphRenderer.jewelCircleThickness * this.zoomFactor;
				this.context.lineCap = "butt";
				this.context.stroke();
			});
		});
	}

	private renderSearchHighlighting(nodes : Immutable.Iterable<number, Node>) : void
	{
		nodes.filter(n => n.IsSearchHighlighted).forEach(n =>
		{
			if (n.AscendancyName != null && !this.skillTree.IsAscendancyClassVisible) return true;

			var largestImage = n.ImagesForState.get(n.State)
				.filter(i => i.Layer == ImageLayer.Icon || i.Layer == ImageLayer.Frame)
				.max(i => i.Type == ImageType.File ? i.Size.Height : i.SpriteSize.Height);

			var rectangle = this.createRectangleAroundPoint(n.CenterPoint, largestImage);
			var center = this.convertToScreenPoint(n.CenterPoint);

			this.context.beginPath();
			this.context.fillStyle = "rgba(192, 0, 0, .5)";
			this.context.arc(center.X, center.Y, rectangle.Height / 1.25, 0, 2 * Math.PI);
			this.context.fill();
		});
	}

	private findNodeImagesToRender(nodes : Immutable.Iterable<number, Node>) : Array<Tuple<Node, SkillTreeImage>>
	{
		var allImages = new Array<Tuple<Node, SkillTreeImage>>(5000);
		var numImagesFound = 0;

		nodes.forEach(n =>
		{
			n.ImagesForState.get(n.State).forEach(i =>
			{
				allImages[numImagesFound++] = new Tuple<Node, SkillTreeImage>(n, i);
			});
		});

		allImages.length = numImagesFound;
		return allImages;
	}

	private renderImagesOnLayer(allImages : Array<Tuple<Node, SkillTreeImage>>, layer : ImageLayer)
	{
		for (var x of allImages)
		{
			if (x.Item2.Layer == layer)
			{
				this.renderImage(x.Item2, this.createRectangleAroundPoint(x.Item1.CenterPoint, x.Item2))
			}
		}
	}

	private renderImage(image : SkillTreeImage, r : Rectangle) : void
	{
		var sLoc = image.SpriteLocation;
		var sSize = image.SpriteSize;

		if (r.X + r.Width < 0 || r.Y + r.Height < 0) return;
		if (r.X > this.context.canvas.width) return;
		if (r.Y > this.context.canvas.height) return;

		if (image.RotationInRadians != 0)
		{
			this.context.save();
			this.context.translate(r.X, r.Y);
			this.context.translate(r.Width/2, r.Height/2);
			this.context.rotate(image.RotationInRadians);
			this.context.drawImage(image.Element, sLoc.X, sLoc.Y, sSize.Width, sSize.Height, -r.Width/2, -r.Height/2, r.Width, r.Height);
			this.context.restore();
		}
		else
		{
			this.context.drawImage(image.Element, sLoc.X, sLoc.Y, sSize.Width, sSize.Height, r.X, r.Y, r.Width, r.Height);
		}
	}

	private renderConnectionType(connections : Immutable.Iterable<number, Connection>, color : string, lineWidth : number)
	{
		this.context.beginPath();
		connections.forEach(c => this.renderConnection(c));
		this.context.strokeStyle = color;
		this.context.lineWidth = lineWidth;
		this.context.lineCap = "butt";
		this.context.stroke();
	}

	private renderConnection(connection : Connection) : void
	{
		var p0 = this.convertToScreenPoint(connection.A.CenterPoint);
		var p1 = this.convertToScreenPoint(connection.B.CenterPoint);

		if (!this.isOnScreen(p0) && !this.isOnScreen(p1)) return;

		if (connection.A.Group.Id == connection.B.Group.Id && connection.A.Radius == connection.B.Radius)
		{
			var groupCenterX = connection.A.Group.Location.X * this.zoomFactor + this.screenOffsetX;
			var groupCenterY = connection.A.Group.Location.Y * this.zoomFactor + this.screenOffsetY;
			var scaledRadius = connection.A.Radius * this.zoomFactor;
			var startRadian = connection.A.Radian - Math.PI/2;
			var endRadian = connection.B.Radian - Math.PI/2;
			var loopsPastStartingPointWhileGoingToTheRight = connection.A.Radian > connection.B.Radian;
			var distanceGoingRight = connection.B.Radian - connection.A.Radian;

			if (loopsPastStartingPointWhileGoingToTheRight) distanceGoingRight = 2 * Math.PI - Math.abs(connection.A.Radian - connection.B.Radian);

			var lessThanHalfWayAroundCircle = distanceGoingRight < Math.PI;

			this.context.moveTo(p0.X, p0.Y);
			this.context.arc(groupCenterX, groupCenterY, scaledRadius, startRadian, endRadian, !lessThanHalfWayAroundCircle);
		}
		else
		{
			this.context.moveTo(p0.X, p0.Y);
			this.context.lineTo(p1.X, p1.Y);
		}
	}

	private isOnScreen(p : Point) : boolean
	{
		if (p.X < 0 && p.X < 0) return false;
		if (p.X > this.context.canvas.width && p.X > this.context.canvas.width) return false;
		return true;
	}

	private createRectangleAroundPoint(graphPoint : Point, image : SkillTreeImage) : Rectangle
	{
		var center = this.convertToScreenPoint(graphPoint);
		var width = image.Size.Width * this.zoomFactor;
		var height = image.Size.Height * this.zoomFactor;
		var x = (center.X - width / 2) + image.Offset.X * this.zoomFactor;
		var y = (center.Y - height / 2) + image.Offset.Y * this.zoomFactor;
		return new Rectangle(x, y, width, height);
	}

	private convertToScreenPoint(graphPoint : Point) : Point
	{
		var centerX = graphPoint.X * this.zoomFactor + this.screenOffsetX;
		var centerY = graphPoint.Y * this.zoomFactor + this.screenOffsetY;
		return new Point(centerX, centerY);
	}

	private convertToGraphPoint(screenPoint : Point) : Point
	{
		var centerX = (screenPoint.X - this.screenOffsetX) / this.zoomFactor;
		var centerY = (screenPoint.Y - this.screenOffsetY) / this.zoomFactor;
		return new Point(centerX, centerY);
	}
}
