const { getBooking } = require('../../lib/store');

/**
 * GET /api/bookings/status?id=bk_xxx
  *
   * La usa la pagina al volver de la pasarela de Fintoc (?pago=exitoso o
    * ?pago=cancelado&booking=bk_xxx) para saber si el pago ya quedo
     * confirmado. El webhook de Fintoc (fintoc-webhook.js) es quien realmente
      * marca el estado final ('paid' / 'failed'); este endpoint solo lo expone
       * para que el frontend pueda consultarlo.
        */
        module.exports = async function handler(req, res) {
          if (req.method !== 'GET') {
              res.status(405).json({ error: 'method not allowed' });
                  return;
                    }

                      const id = req.query && req.query.id;
                        if (!id) {
                            res.status(400).json({ error: 'id es requerido' });
                                return;
                                  }

                                    const booking = await getBooking(id);
                                      if (!booking) {
                                          res.status(404).json({ error: 'no encontrada' });
                                              return;
                                                }

                                                  res.status(200).json({
                                                      status: booking.status,
                                                          serviceId: booking.serviceId,
                                                              slot: booking.slot,
                                                                });
                                                                };
                                                                
