const $ = (id) => document.getElementById(id);

let creditoBase = null;
let listaPrepagos = [];

document.addEventListener("DOMContentLoaded", () => {
    $("btn-cotizar").addEventListener("click", realizarCotizacion);
    $("btn-limpiar").addEventListener("click", reiniciarFormulario);
    $("btn-ver-tabla").addEventListener("click", mostrarOcultarTabla);
});

function convertirNumero(valor) {
    return parseFloat(valor) || 0;
}

function formatoDinero(cantidad) {
    return "$" + cantidad.toFixed(2);
}

function realizarCotizacion() {
    const cliente = $("nombre").value.trim();
    const monto = convertirNumero($("montoAutorizado").value);
    const comision = convertirNumero($("comisionPorcentaje").value);
    const meses = parseInt($("plazo").value);
    const interesAnual = convertirNumero($("tasa").value);
    const catIngresado = convertirNumero($("cat").value);

    if (cliente === "") {
        alert("Ingresa el nombre del cliente.");
        return;
    }

    if (monto <= 0) {
        alert("Ingresa un monto autorizado válido.");
        return;
    }

    if (comision < 0) {
        alert("Ingresa el porcentaje de comisión.");
        return;
    }

    if (!meses || meses <= 0) {
        alert("Selecciona el plazo del crédito.");
        return;
    }

    if (interesAnual <= 0) {
        alert("Ingresa la tasa de interés anual.");
        return;
    }

    const comisionSinIVA = monto * (comision / 100);
    const ivaComision = comisionSinIVA * 0.16;
    const comisionFinal = comisionSinIVA + ivaComision;

    const montoTotal = monto + comisionFinal;
    const interesMensual = interesAnual / 100 / 12;
    const capitalMensual = montoTotal / meses;

    const interesPrimerMes = montoTotal * interesMensual;
    const ivaInteresPrimerMes = interesPrimerMes * 0.16;
    const pagoInicial = capitalMensual + interesPrimerMes + ivaInteresPrimerMes;

    const pagoMil = pagoInicial / (montoTotal / 1000);

    $("comisionMonto").innerHTML = formatoDinero(comisionFinal);
    $("totalFinanciar").innerHTML = formatoDinero(montoTotal);
    $("pagoPorMil").innerHTML = formatoDinero(pagoMil);

    creditoBase = {
        cliente,
        monto,
        comisionFinal,
        montoTotal,
        meses,
        interesMensual,
        capitalMensual,
        interesAnual,
        catIngresado
    };

    window.datosCredito = { ...creditoBase };

    listaPrepagos = [];
}

function mostrarOcultarTabla() {
    const contenedorTabla = $("tabla-container");

    if (contenedorTabla.style.display === "none") {
        if (!window.datosCredito) {
            alert("Primero debes generar una cotización.");
            return;
        }

        crearTablaAmortizacion();
        contenedorTabla.style.display = "block";
    } else {
        contenedorTabla.style.display = "none";
    }
}

function crearTablaAmortizacion() {
    const datos = window.datosCredito;

    let saldo = datos.montoTotal;
    const cuerpoTabla = document.querySelector("#tabla-amortizacion tbody");
    cuerpoTabla.innerHTML = "";

    let sumaIntereses = 0;
    let sumaIVA = 0;
    let sumaPagos = 0;
    let sumaPrepagos = 0;

    while (listaPrepagos.length < datos.meses) {
        listaPrepagos.push(0);
    }

    for (let mes = 1; mes <= datos.meses; mes++) {
        const interesMes = saldo * datos.interesMensual;
        const ivaInteres = interesMes * 0.16;

        let prepagoActual = listaPrepagos[mes - 1] || 0;
        let pagoTotalMes = datos.capitalMensual + interesMes + ivaInteres + prepagoActual;

        sumaIntereses += interesMes;
        sumaIVA += ivaInteres;
        sumaPagos += pagoTotalMes;
        sumaPrepagos += prepagoActual;

        const fila = cuerpoTabla.insertRow();

        fila.innerHTML = `
            <td>${mes}</td>
            <td>${formatoDinero(saldo)}</td>
            <td>${formatoDinero(interesMes)}</td>
            <td>${formatoDinero(datos.capitalMensual)}</td>
            <td>${formatoDinero(ivaInteres)}</td>
            <td>${formatoDinero(pagoTotalMes)}</td>
            <td>
                <input 
                    type="number" 
                    id="prepago_${mes}" 
                    value="${prepagoActual}" 
                    step="100" 
                    style="width: 100px; padding: 5px;" 
                    placeholder="0">
            </td>
        `;

        saldo -= datos.capitalMensual;
        saldo -= prepagoActual;

        if (saldo < 0) {
            saldo = 0;
        }
    }

    agregarResumenFinal(sumaIntereses, sumaIVA, sumaPagos, sumaPrepagos);

    for (let mes = 1; mes <= datos.meses; mes++) {
        const entradaPrepago = $("prepago_" + mes);

        if (entradaPrepago) {
            entradaPrepago.addEventListener("change", function () {
                listaPrepagos[mes - 1] = convertirNumero(this.value);
                actualizarTabla();
            });
        }
    }
}

function agregarResumenFinal(totalIntereses, totalIVA, totalPagado, totalPrepagos) {
    const tabla = $("tabla-amortizacion");
    const pieAnterior = document.querySelector("#tabla-amortizacion tfoot");

    if (pieAnterior) {
        pieAnterior.remove();
    }

    const pieTabla = document.createElement("tfoot");

    const catFinal = $("cat").value || creditoBase.catIngresado || "0";

    const ahorro = 
        (creditoBase.montoTotal + totalIntereses + totalIVA) - totalPagado;

    pieTabla.innerHTML = `
        <tr style="background-color: #1f3a5f; color: white; font-weight: bold;">
            <td colspan="2">RESUMEN</td>
            <td>${formatoDinero(totalIntereses)}</td>
            <td>${formatoDinero(creditoBase.capitalMensual * creditoBase.meses)}</td>
            <td>${formatoDinero(totalIVA)}</td>
            <td>${formatoDinero(totalPagado)}</td>
            <td>${formatoDinero(totalPrepagos)}</td>
        </tr>

        <tr style="background-color: #f1f4f8; font-weight: bold;">
            <td colspan="7" style="text-align: left; padding: 12px;">
                <strong>DETALLE FINAL DEL CRÉDITO</strong><br><br>

                Cliente: ${creditoBase.cliente}<br>
                Monto autorizado: ${formatoDinero(creditoBase.monto)}<br>
                Comisión con IVA: ${formatoDinero(creditoBase.comisionFinal)}<br>
                Total financiado: ${formatoDinero(creditoBase.montoTotal)}<br>
                Tasa anual: ${creditoBase.interesAnual}%<br>
                CAT: ${catFinal}%<br>
                Plazo seleccionado: ${creditoBase.meses} meses<br><br>

                <span style="color: #1f3a5f;">
                    Total de intereses: ${formatoDinero(totalIntereses)}
                </span><br>

                <span style="color: #1f3a5f;">
                    IVA de intereses: ${formatoDinero(totalIVA)}
                </span><br>

                <span style="color: #1f3a5f;">
                    Total general a pagar: ${formatoDinero(totalPagado)}
                </span><br>

                <span style="color: #1f3a5f;">
                    Total de prepagos: ${formatoDinero(totalPrepagos)}
                </span><br><br>

                <span style="color: #198754;">
                    Ahorro generado por prepagos: ${formatoDinero(ahorro)}
                </span>
            </td>
        </tr>
    `;

    tabla.appendChild(pieTabla);
}

function actualizarTabla() {
    if (!creditoBase) {
        return;
    }

    window.datosCredito = { ...creditoBase };
    crearTablaAmortizacion();
}

function reiniciarFormulario() {
    $("nombre").value = "";
    $("montoAutorizado").value = "";
    $("comisionPorcentaje").value = "";
    $("plazo").value = "";
    $("tasa").value = "";
    $("cat").value = "";

    $("comisionMonto").innerHTML = "$0.00";
    $("totalFinanciar").innerHTML = "$0.00";
    $("pagoPorMil").innerHTML = "$0.00";

    $("tabla-container").style.display = "none";
    document.querySelector("#tabla-amortizacion tbody").innerHTML = "";

    const pieTabla = document.querySelector("#tabla-amortizacion tfoot");

    if (pieTabla) {
        pieTabla.remove();
    }

    creditoBase = null;
    window.datosCredito = null;
    listaPrepagos = [];
}