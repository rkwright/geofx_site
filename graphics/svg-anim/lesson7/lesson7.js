
var     MIN_ALTITUDE = -175.0;
var     INITIAL_VELOCITY = 24;
var     OPACITY_DECREMENT = 0.005;
var     CANNON_ANGLE = 45;
var		posX      = 0;
var		posY      = 0;
var		bFlying   = false;
var		startTime;
var		elapsed;
var		CannonSound;
var		CannonBall;
var		CannonBallPath;
var     FireButtonFill;
var     FireButton;
var     TrajectoryInfo;
var		opacity = 1.0;
var		velocity;
var		gravity = 9.802;    // m/s**
var		speedY = 0;
var		speedX = 0;
var		DEG2RAD   = 0.0174532925199433;
var		points      = "";
var     svgDoc;
var     intervalID;

function on_load(evt)
{
    svgDoc = getSVGDoc(evt.target);

    CannonBall     = svgDoc.getElementById('CannonBall');
    TrajectoryInfo = svgDoc.getElementById('TrajectoryInfo');
    CannonBallPath = svgDoc.getElementById('CannonBallPath');
    FireButton     = svgDoc.getElementById('FireButton');
    FireButtonFill = svgDoc.getElementById('FireButtonFill');
    CannonSound    = window.parent.document.getElementById("audio-cannon");
}

function  getSVGDoc(node) {
    if (node.nodeType == 9)
        return node;
    else
        return node.ownerDocument;
}

function OnMouseDownFire(evt) {
    CannonSound.play();
    startTime = new Date();

    points="";
    bFlying = true;
    posY = 0;
    CannonBall.setAttribute("display", "inline" );

    velocity = INITIAL_VELOCITY;
    speedY = velocity * Math.sin(CANNON_ANGLE * DEG2RAD);
    speedX = velocity * Math.cos(CANNON_ANGLE * DEG2RAD);

    opacity = 1.0;

    CannonBallPath.setAttribute("points", points );
    CannonBallPath.setAttribute("stroke-opacity", opacity );
    FireButtonFill.setAttribute("fill", "#000080");
    FireButton.setAttribute("pointer-events", "none" );
    FireButton.setAttribute("opacity", "0.5");
    intervalID = window.setInterval('next_update()', 16);
}

function next_update ()  {

    elapsed = (Date.now() - startTime.getTime()) / 1000.0;

    if (posY < MIN_ALTITUDE && bFlying == true)
    {
        bFlying = false;
        console.log("Done flying");
    }
    else
    {
        if (bFlying == true)
        {
            posX = elapsed * speedX;
            posY = elapsed * speedY - 0.5 * gravity * elapsed * elapsed;
            velocity = Math.sqrt(speedX*speedX + speedY*speedY);

            //console.log(" x: " + posX.toFixed(1) + " y:" + posY.toFixed(1) + " v: " + velocity.toFixed(1));

            points = points + posX.toFixed(1) + ',';
            points = points + posY.toFixed(1) + ' ';

            CannonBall.setAttribute("cy", posY );
            CannonBall.setAttribute("cx", posX );
            CannonBallPath.setAttribute("points", points );

            TrajectoryInfo.firstChild.nodeValue = 't: ' + elapsed.toFixed(1) + ' v: ' + velocity.toFixed(1) + ' y: ' + posY.toFixed(1);
        }
        else {
            opacity -= OPACITY_DECREMENT;
            CannonBallPath.setAttribute("stroke-opacity", opacity );
            if (opacity <= 0) {
                window.clearTimeout( intervalID );
                points = "";
                FireButtonFill.setAttribute("fill", "#C00000");
                FireButton.setAttribute("opacity", "1");
                FireButton.setAttribute("pointer-events", "auto" );
            }
        }
    }
}


