function initCircleModel(gl, iterations)
{
    if (typeof iterations !== "number" || iterations < 1)
        iterations = 1;

    let count = 3; //first iteration requires 3 vertexes

    //each successive iteration requires twice as many vertexes as the previous iteration
    let vertexesNeededThisIteration = 9;
    for (let i = 1; i < iterations; ++i) {
        count += vertexesNeededThisIteration;
        vertexesNeededThisIteration *= 2;
    }

    const model = new Int8Array(count * 4);
    let i = 0;
    let radius = 127;

    //first iteration
    for (let v = 0; v < 3; ++v) {
        let theta = Math.PI * 2/3 * v;
        model[i++] = Math.cos(theta) * radius;
        model[i++] = Math.sin(theta) * radius;
        model[i++] = model[i - 3] + 127;
        model[i++] = -model[i - 3] + 127;
    }

    //further iterations subdivide the exposed sides into more polygons
    let polygons = 3;
    for (let iteration = 2; iteration <= iterations; ++iteration) {
        for (let p = 0; p < polygons; ++p) {
            for (let v = 0; v < 3; ++v) {
                let theta = Math.PI * (p * 2 + v) / polygons;
                model[i++] = Math.cos(theta) * radius;
                model[i++] = Math.sin(theta) * radius;
                model[i++] = model[i - 3] + 127;
                model[i++] = -model[i - 3] + 127;
            }
        }

        polygons *= 2;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {buffer, positionType: gl.BYTE, vertexCount: model.length / 4};
}

function initFloor(gl, floorHeight) {
    const model = new Int8Array(3 * 4);
    let i = 0;

    for (let [x, y] of [[-100, floorHeight], [100, floorHeight], [0, -100]]) {
        console.log(x, y);
        model[i++] = x;
        model[i++] = y;
        model[i++] = 50;
        model[i++] = 50;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {buffer, positionType: gl.BYTE, vertexCount: model.length / 4};
}