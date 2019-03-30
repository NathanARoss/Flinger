export function initCircle(gl, iterations, r, g, b) {
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
    const radius = 127;

    const [u, v] = packColors(r, g, b);

    //first iteration
    for (let vertex = 0; vertex < 3; ++vertex) {
        let theta = Math.PI * 2 / 3 * vertex;
        model[i++] = Math.cos(theta) * radius;
        model[i++] = Math.sin(theta) * radius;
        model[i++] = u;
        model[i++] = v;
    }

    //further iterations subdivide the exposed sides into more polygons
    let polygons = 3;
    for (let iteration = 2; iteration <= iterations; ++iteration) {
        for (let p = 0; p < polygons; ++p) {
            for (let vertex = 0; vertex < 3; ++vertex) {
                let theta = Math.PI * (p * 2 + vertex) / polygons;
                model[i++] = Math.cos(theta) * radius;
                model[i++] = Math.sin(theta) * radius;
                model[i++] = u;
                model[i++] = v;
            }
        }

        polygons *= 2;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 4,
        mode: gl.TRIANGLES
    };
}

export function initBox(gl, r, g, b) {
    const model = new Int8Array(4 * 4);
    i = 0;

    const [u, v] = packColors(r, g, b);

    model[i++] = +127;
    model[i++] = +127;
    model[i++] = u;
    model[i++] = v;

    model[i++] = -127;
    model[i++] = +127;
    model[i++] = u;
    model[i++] = v;

    model[i++] = +127;
    model[i++] = -127;
    model[i++] = u;
    model[i++] = v;

    model[i++] = -127;
    model[i++] = -127;
    model[i++] = u;
    model[i++] = v;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 4,
        mode: gl.TRIANGLE_STRIP
    };
}

export function initTexturedBox(gl, u1, v1, u2, v2) {
    const model = new Int8Array(4 * 4);
    let i = 0;

    model[i++] = +127;
    model[i++] = +127;
    model[i++] = u2;
    model[i++] = v1;

    model[i++] = -127;
    model[i++] = +127;
    model[i++] = u1;
    model[i++] = v1;

    model[i++] = +127;
    model[i++] = -127;
    model[i++] = u2;
    model[i++] = v2;

    model[i++] = -127;
    model[i++] = -127;
    model[i++] = u1;
    model[i++] = v2;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 4,
        mode: gl.TRIANGLE_STRIP
    };
}

export function initPolygon(gl, verticies, r, g, b) {
    const vertexCount = verticies.length / 2;
    const polygonCount = vertexCount - 2;
    const model = new Int8Array(polygonCount * 3 * 4);
    let used = 0;

    const [u, v] = packColors(r, g, b);

    let fail = 100;
    while (verticies.length > 4 && --fail >= 0) {
        for (let i = 0; i < verticies.length; i += 2) {
            const clockwise = ((verticies[i + 3] - verticies[i + 1]) * (verticies[i + 4] - verticies[i + 2]) -
                (verticies[i + 2] - verticies[i + 0]) * (verticies[i + 5] - verticies[i + 3])) > 0;

            if (clockwise) {
                model[used++] = verticies[i];
                model[used++] = verticies[i + 1];
                model[used++] = u;
                model[used++] = v;

                model[used++] = verticies[i + 2];
                model[used++] = verticies[i + 3];
                model[used++] = u;
                model[used++] = v;

                model[used++] = verticies[i + 4];
                model[used++] = verticies[i + 5];
                model[used++] = u;
                model[used++] = v;

                verticies.splice(i + 2, 2);
                break;
            }
        }
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 4,
        mode: gl.TRIANGLES
    };
}

export function packColors(r, g, b) {
    const packedColor = (r * 31) | 0 | ((g * 63) | 0) << 5 | ((b * 31) | 0) << 11;
    const u = packedColor & 0xFF;
    const v = packedColor >>> 8;
    return [u, v];
}