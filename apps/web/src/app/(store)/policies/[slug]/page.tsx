import { notFound } from 'next/navigation';

const POLICIES: Record<
  string,
  { title: string; body: React.ReactNode }
> = {
  'refund-policy': {
    title: 'Refund & Cancellation Policy',
    body: (
      <>
        <p>
          At Lu&apos;s Shoe Farm, we want you to be happy with your purchase.
          If there is a problem with your order, please contact us as soon as
          possible so we can help.
        </p>

        <h2>Returns</h2>
        <p>
          We accept returns within 7 days of delivery, provided the shoes are
          unworn, undamaged, and returned in their original condition and
          packaging.
        </p>

        <p>
          Shoes that have been worn, damaged, altered, or returned without
          their original packaging may not be eligible for a refund or
          exchange.
        </p>

        <h2>How to Request a Return</h2>
        <p>
          To request a return, contact us at{' '}
          <a
            href="mailto:giggleoftheamazon@gmail.com"
            className="text-brand underline"
          >
            giggleoftheamazon@gmail.com
          </a>{' '}
          within 7 days of receiving your order. Please include your order
          number and a brief description of the reason for the return.
        </p>

        <h2>Refunds</h2>
        <p>
          Once your returned item has been received and inspected, we will
          notify you whether your refund has been approved. Approved refunds
          will be processed using the original payment method where possible.
        </p>

        <p>
          Please note that shipping or delivery charges may not be refundable,
          unless the return is due to an error on our part or a defective
          product.
        </p>

        <h2>Exchanges</h2>
        <p>
          If you received the wrong size or have another issue with your
          order, please contact us. Exchanges are subject to product
          availability.
        </p>

        <h2>Damaged or Incorrect Orders</h2>
        <p>
          If your order arrives damaged, defective, or different from what you
          ordered, please contact us within 48 hours of delivery. Photos or
          other information may be requested to help us resolve the issue.
        </p>

        <h2>Order Cancellation</h2>
        <p>
          You may request to cancel an order before it has been dispatched.
          Once an order has been dispatched, it may no longer be possible to
          cancel it and you may need to follow our return process instead.
        </p>
      </>
    ),
  },

  'privacy-policy': {
    title: 'Privacy Policy',
    body: (
      <>
        <p>
          Your privacy matters to us. This Privacy Policy explains how
          Lu&apos;s Shoe Farm collects, uses, and protects information when
          you use our website or purchase our products.
        </p>

        <h2>Information We Collect</h2>
        <p>
          When you place an order or interact with our website, we may collect
          information such as your name, email address, phone number, delivery
          address, billing information, and order details.
        </p>

        <p>
          We may also collect technical information such as your browser,
          device type, IP address, and information about how you use our
          website.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          We may use your information to:
        </p>

        <ul>
          <li>Process and deliver your orders.</li>
          <li>Communicate with you about your orders.</li>
          <li>Provide customer support.</li>
          <li>Improve our website, products, and services.</li>
          <li>Prevent fraud and protect our customers and business.</li>
          <li>
            Send promotional communications where you have chosen to receive
            them.
          </li>
        </ul>

        <h2>Payment Information</h2>
        <p>
          Payments may be processed by third-party payment providers. We do
          not intend to store your complete card details on our own systems.
          Payment information is handled according to the payment provider&apos;s
          own policies and security practices.
        </p>

        <h2>Sharing Your Information</h2>
        <p>
          We do not sell your personal information. We may share necessary
          information with trusted service providers who help us operate our
          business, such as payment processors, delivery companies, hosting
          providers, and technology providers.
        </p>

        <h2>Cookies</h2>
        <p>
          Our website may use cookies and similar technologies to remember
          preferences, keep the website functioning properly, understand
          website usage, and improve your experience.
        </p>

        <h2>Your Choices</h2>
        <p>
          You may contact us if you have questions about the personal
          information we hold about you or if you would like to request that
          we update or delete information, subject to applicable legal
          requirements.
        </p>

        <h2>Contact Us</h2>
        <p>
          For privacy-related questions, contact us at{' '}
          <a
            href="mailto:giggleoftheamazon@gmail.com"
            className="text-brand underline"
          >
            giggleoftheamazon@gmail.com
          </a>
          .
        </p>
      </>
    ),
  },

  'data-retention-policy': {
    title: 'Data Retention Policy',
    body: (
      <>
        <p>
          Lu&apos;s Shoe Farm keeps personal information only for as long as
          reasonably necessary for the purposes for which it was collected,
          including providing our services, maintaining business records,
          resolving disputes, and meeting legal or regulatory obligations.
        </p>

        <h2>Order Information</h2>
        <p>
          Information relating to purchases may be retained for as long as
          necessary to process orders, provide customer support, maintain
          appropriate business and financial records, and comply with
          applicable requirements.
        </p>

        <h2>Account Information</h2>
        <p>
          If you create an account, we may retain your account information
          while your account remains active. You may contact us to request
          deletion of your account information, subject to information that
          we are required or permitted to retain.
        </p>

        <h2>Marketing Information</h2>
        <p>
          If you subscribe to promotional communications, we may retain your
          contact information until you unsubscribe or request that we stop
          sending marketing communications.
        </p>

        <h2>Deletion</h2>
        <p>
          When personal information is no longer reasonably required, we may
          securely delete, anonymize, or otherwise dispose of it.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about how we retain information, contact us at{' '}
          <a
            href="mailto:giggleoftheamazon@gmail.com"
            className="text-brand underline"
          >
            giggleoftheamazon@gmail.com
          </a>
          .
        </p>
      </>
    ),
  },

  'terms-of-service': {
    title: 'Terms of Service',
    body: (
      <>
        <p>
          Welcome to Lu&apos;s Shoe Farm. By accessing or using our website,
          you agree to these Terms of Service. Please read them carefully
          before using our website or placing an order.
        </p>

        <h2>Using Our Website</h2>
        <p>
          You agree to use our website lawfully and not to misuse, disrupt, or
          attempt to gain unauthorized access to any part of the website.
        </p>

        <h2>Products and Pricing</h2>
        <p>
          We make reasonable efforts to ensure that product descriptions,
          images, prices, and availability are accurate. However, errors may
          occasionally occur.
        </p>

        <p>
          We reserve the right to correct errors, update product information,
          change prices, or modify product availability at any time.
        </p>

        <h2>Orders</h2>
        <p>
          Placing an order constitutes a request to purchase a product.
          Orders are subject to availability and confirmation.
        </p>

        <p>
          We reserve the right to refuse or cancel an order in circumstances
          such as suspected fraud, incorrect pricing, unavailable products,
          or other legitimate business reasons.
        </p>

        <h2>Payment</h2>
        <p>
          Payment must be successfully completed before an order can be
          processed, unless we expressly offer another payment arrangement.
        </p>

        <h2>Delivery</h2>
        <p>
          We aim to dispatch and deliver orders within the estimated time
          communicated at checkout or during the ordering process. Delivery
          times may vary depending on location, courier availability, weather,
          public holidays, and other circumstances outside our control.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          Unless otherwise stated, the content on this website, including
          images, logos, graphics, text, and branding, belongs to or is
          licensed to Lu&apos;s Shoe Farm and may not be copied or used
          without permission.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          We will take reasonable steps to provide a reliable service.
          However, we are not responsible for losses caused by circumstances
          beyond our reasonable control, including third-party service
          interruptions, delivery delays, technical failures, or events beyond
          our control.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We may update these Terms of Service from time to time. Updated
          terms will be posted on this page, and continued use of the website
          after an update constitutes acceptance of the updated terms to the
          extent permitted by law.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about these terms, contact us at{' '}
          <a
            href="mailto:giggleoftheamazon@gmail.com"
            className="text-brand underline"
          >
            giggleoftheamazon@gmail.com
          </a>
          .
        </p>
      </>
    ),
  },
};

export default async function Policy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = POLICIES[(await params).slug];

  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-2xl sm:text-3xl md:text-4xl italic text-brand">
        {p.title}
      </h1>

      <div className="mt-8 space-y-6 leading-7 text-neutral-700">
        {p.body}
      </div>
    </div>
  );
}
