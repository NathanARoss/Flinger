class Mat4 {
    constructor() {
        this.data = new Float32Array(16);
        this.data[0] = 1;
        this.data[5] = 1;
        this.data[10] = 1;
        this.data[15] = 1;
    }

    static perspectiveMatrix(out, fov, aspect, near, far) {
        let f = 1 / Math.tan(fov / 2);
        let nf = 1 / (near - far);

        out.data.fill(0);
        out.data[0] = f / aspect;
        out.data[5] = f;
        out.data[10] = (far + near) * nf;
        out.data[11] = -1;
        out.data[14] = 2 * far * near * nf;
    };

    // static translationMatrix(out, [x, y, z]) {
    //     out.data.fill(0);
    //     out.data[0] = 1;
    //     out.data[5] = 1;
    //     out.data[10] = 1;
    //     out.data.set([x, y, z, 1], 12);
    // }

    static multiply(out, a, b) {
        for (let i = 0; i < 16; ++i) {
            out.data[i] = b.data[0 | i & ~3] * a.data[0 | i & 3]
                        + b.data[1 | i & ~3] * a.data[4 | i & 3]
                        + b.data[2 | i & ~3] * a.data[8 | i & 3]
                        + b.data[3 | i & ~3] * a.data[12 | i & 3];
        }
    };

    static translate(out, a, [x, y, z]) {
        if (a !== out) {
            out.data.set(a.data.slice(0, 12));
        }

        out.data[12] = a.data[0] * x + a.data[4] * y + a.data[8] * z + a.data[12];
        out.data[13] = a.data[1] * x + a.data[5] * y + a.data[9] * z + a.data[13];
        out.data[14] = a.data[2] * x + a.data[6] * y + a.data[10] * z + a.data[14];
        out.data[15] = a.data[3] * x + a.data[7] * y + a.data[11] * z + a.data[15];
    };

    static scale(out, a, [x, y, z]) {
        for (let i = 0; i < 4; ++i) {
            out.data[0 + i] = a.data[0 + i] * x;
            out.data[4 + i] = a.data[4 + i] * y;
            out.data[8 + i] = a.data[8 + i] * z;
            out.data[12 + i] = a.data[12 + i];
        }
    };
}

Mat4.IDENTITY = new Mat4();