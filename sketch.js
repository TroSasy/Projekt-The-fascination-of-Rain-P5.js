let video;

var w = window.innerWidth;
var h = window.innerHeight;

let rainDrops;
let rd = 2;
let poseNet;
let poses = [];
let limbs;

let limbsVisible = true;


let minDropsPerFrame = 3;
let currentBackgroundColors = {
  c1: null,
  c2: null,
  c3: null
};
let targetColors = {
  c1: null,
  c2: null,
  c3: null
};3
let transitionSpeed = 0.05;

function setup() {
  createCanvas(w, h);
  video = createCapture(VIDEO);
  video.size(width, height);
  poseNet = ml5.poseNet(video);
  poseNet.on("pose", function (results) {
    poses = results;
  });
  video.hide();
  
  world.gravity.y = 50;
  
  // Erstellung Sprites
  // Skelett
  limbs = new Group();
  limbs.collider = "static";
  limbs.color = "black";
  limbs.stroke = "black";
  limbs.visible = limbsVisible;

  // Initialize current and target colors as p5.Color objects
  currentBackgroundColors.c1 = color('#0000');
  currentBackgroundColors.c2 = color('#0000');
  currentBackgroundColors.c3 = color('#0000');

  targetColors.c1 = color('#0000');
  targetColors.c2 = color('#0000');
  targetColors.c3 = color('#0000');
  
  // Initialize the rainDrops group
  rainDrops = new Group();
}

function draw() {
  image(video, 0, 0, width, height);
  video.hide();

  
  limbs.removeAll();
  drawSkeleton();
  
  // Halbtransparente schwarze Fläche über das Video zeichnen
  fill(0, 0, 0); // mit Transparenz
  rect(0, 0, width, height);
  
  // Draw background with transitioning colors
  drawBackground();
  
  // Erzeugt Bälle an zufälligen Positionen
  createRaindrops(minDropsPerFrame);
 
  // Zeichne alle Regentropfen
  rainDrops.draw(); // Methode der p5.play-Bibliothek zum Zeichnen aller Sprites
  
  // Entferne Regentropfen, die den Bildschirm verlassen haben
  removeOffscreenDrops();
}

window.onresize = function() {
  // assigns new values for width and height variables
  w = window.innerWidth;
  h = window.innerHeight;  
  canvas.size(w,h);
}

function createRaindrops(numDrops) {
  for (let i = 0; i < numDrops; i++) {
    let x = random(width); // Zufällige x-Position über die Breite der Leinwand
    let drop = createSprite(x, -100, rd); // (x, y, Durchmesser)
    drop.color = "white"; // Weiß
    drop.stroke = "white";
    rainDrops.add(drop);
  }
}

// Funktion zum Skelett zeichnen
function drawSkeleton() {
  
  // Definition der Verbindung für Arme, Beine und Kopf
  // mithilfe von den Keypoints
  const connections = [
    
    // linker Arm
    [5, 7], // linke Schulter => linker Ellenbogen
    [7, 9], // linker Ellenbogen => linke Handgelenk
    
    // rechter Arm
    [6, 8], // rechte Schulter => rechte Ellenbogen
    [8, 10],// rechte Ellenbogen => rechte Handgelenk
    
    // linkes Bein
    [11, 13], // linke Hüfte => linkes Knie
    [13, 15], // linkes Knie => linker Knöchel
    
    // rechtes Bein
    [12, 14], // rechte Hüfte => rechtes Knie
    [14, 16], // rechtes Knie => rechter Knöchel
    
    // Verbindung zwischen linker und rechter Schulter
    //[5, 6] // linke Schulter => rechte Schulter
    
    //Verbindung zwischen Nase und Schultern
    [5, 1],
    [6, 1]
  ];
  
  // Schleife durch alle Posen, die erkannt werden
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i].pose;

    // Zeichnet für jede Verbindung ein Limb (Stripe)
    for (let j = 0; j < connections.length; j++) {
      let partA = pose.keypoints[connections[j][0]];
      let partB = pose.keypoints[connections[j][1]];

      // Checkt wie sicher Keypoint erkennbar ist
      //je näher an 1 desto "sicherer" schätz Posenet die Körperpunkte
      // je näher an 0 desto mehr nicht vorhandenen Keypoints werden geschätzt
      if (partA.score > 0.1 && partB.score > 0.1) {
        // Berechnung der notwendigen Parameter für die Gliedmaßen
        let spriteX = (partA.position.x + partB.position.x) / 2;
        let spriteY = (partA.position.y + partB.position.y) / 2;
        let distance = dist(
          partA.position.x,
          partA.position.y,
          partB.position.x,
          partB.position.y
        );
        let angle = atan2(
          partA.position.y - partB.position.y,
          partA.position.x - partB.position.x
        );

        // Erstellung der Körperteile = Skelett
        // Wichtig: Erstellung als Sprite notwendig für Kollision
        let sprite = new limbs.Sprite(
          spriteX,
          spriteY,
          distance,
          width * 0.015
        );
        sprite.rotation = angle;
      }
    }

    // Zeichnet den Kopf als Kreis
    let nose = pose.keypoints[0]; // Index 0 ist die Nase
    let leftEye = pose.keypoints[1]; // Index 1 ist das linke Auge
    let rightEye = pose.keypoints[2]; // Index 2 ist das rechte Auge

    // Zeichne den Kopf auch bei geringer Zuversicht
    let eyeDistance = dist(
      leftEye.position.x,
      leftEye.position.y,
      rightEye.position.x,
      rightEye.position.y
    );
    let radius = eyeDistance * 1.5; // Radius des Kopfes basierend auf der Augenabstand

    let headSprite = new limbs.Sprite(
      nose.position.x,
      nose.position.y,
      radius * 2,
      radius * 2
    );
    headSprite.shape = 'circle';
  }
}

function drawBackground() {
  // Calculate transition colors
  let c1 = lerpColor(currentBackgroundColors.c1, targetColors.c1, transitionSpeed);
  let c2 = lerpColor(currentBackgroundColors.c2, targetColors.c2, transitionSpeed);
  let c3 = lerpColor(currentBackgroundColors.c3, targetColors.c3, transitionSpeed);

  for (let y = 0; y < height; y++) {
    let inter;
    if (y < height / 2) {
      inter = map(y, 0, height / 2, 0, 1);
      let c = lerpColor(c1, c2, inter);
      stroke(c);
      line(0, y, width, y);
    } else {
      inter = map(y, height / 2, height, 0, 1);
      let c = lerpColor(c2, c3, inter);
      stroke(c);
      line(0, y, width, y);
    }
  }

  // Update current background colors
  currentBackgroundColors.c1 = c1;
  currentBackgroundColors.c2 = c2;
  currentBackgroundColors.c3 = c3;
}

function setMinDropsPerFrame(minDrops) {
  minDropsPerFrame = minDrops;

  // Update target colors based on minDropsPerFrame
  if (minDropsPerFrame === 1) {
    targetColors.c1 = color('#0000');
    targetColors.c2 = color('#0000');
    targetColors.c3 = color('#0000');
  } else if (minDropsPerFrame === 3) {
    targetColors.c1 = color('#0000');
    targetColors.c2 = color('#0000');
    targetColors.c3 = color('#0000');
  } else if (minDropsPerFrame === 6) {
    targetColors.c1 = color('#0000');
    targetColors.c2 = color('#0000');
    targetColors.c3 = color('#0000');
  }
}

function keyPressed() {
  if (key === '1') {
    setMinDropsPerFrame(1);
  } else if (key === '2') {
    setMinDropsPerFrame(3);
  } else if (key === '3') {
    setMinDropsPerFrame(6);
  }
}

function removeOffscreenDrops() {
  for (let i = rainDrops.length - 1; i >= 0; i--) {
    if (rainDrops[i].position.y > height + 10) {
      rainDrops[i].remove();
    }
  }
}
