export default function LiveQueueBoard() {
  const currentToken = 11;
  const myToken = 13;
  const totalTokens = 23;

  const tokens = Array.from(
    { length: totalTokens },
    (_, index) => index + 1
  );

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* Header */}

      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">

          <div>
            <h1 className="text-2xl font-bold text-blue-900">
              MediQueue
            </h1>
          </div>

          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            👤
          </div>

        </div>
      </header>

      <main className="max-w-6xl mx-auto p-5">

        {/* Doctor Info */}

        <section className="bg-white border rounded-xl p-5 shadow-sm mb-6">

          <h2 className="text-xl font-semibold flex items-center gap-2">
            Dr Ahmad Mir

            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          </h2>

          <p className="text-gray-500 mt-1">
            General Medicine • iQuasar Health
          </p>

        </section>

        {/* Stats */}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">

          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs uppercase text-gray-500">
              Current
            </p>

            <p className="text-3xl font-bold text-yellow-700">
              {currentToken}
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-400 rounded-xl p-4 text-center">
            <p className="text-xs uppercase text-purple-700 font-bold">
              Your Pos.
            </p>

            <p className="text-3xl font-bold text-purple-700">
              #{myToken - currentToken}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs uppercase text-gray-500">
              Waiting
            </p>

            <p className="text-3xl font-bold">
              {totalTokens - currentToken}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs uppercase text-gray-500">
              Completed
            </p>

            <p className="text-3xl font-bold">
              {currentToken - 1}
            </p>
          </div>

        </section>

        {/* Queue Board */}

        <section className="bg-white border rounded-xl p-5 shadow-sm">

          <h2 className="text-xl font-semibold mb-5">
            Live Queue
          </h2>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">

            {tokens.map((token) => {

              let style =
                "bg-blue-100 text-blue-900 border-blue-200";

              let icon = null;

              if (token < currentToken) {
                style =
                  "bg-green-100 text-green-800 border-green-300";

                icon = "✓";
              }

              if (token === currentToken) {
                style =
                  "bg-yellow-100 text-yellow-800 border-2 border-yellow-400 scale-110";

                icon = "▶";
              }

              if (token === myToken) {
                style =
                  "bg-purple-100 text-purple-800 border-2 border-purple-400 scale-105";

                icon = "★";
              }

              return (
                <div
                  key={token}
                  className={`h-14 w-14 rounded-lg border flex flex-col items-center justify-center transition ${style}`}
                >
                  <span className="font-bold">
                    {String(token).padStart(2, "0")}
                  </span>

                  {icon && (
                    <span className="text-xs">
                      {icon}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}

          <div className="mt-6 flex flex-wrap gap-4 text-sm">

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              Completed
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded"></div>
              Current
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-400 rounded"></div>
              Your Token
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              Waiting
            </div>

          </div>

          <div className="mt-6 text-center text-gray-500">
            Queue updates automatically
          </div>

        </section>

      </main>
    </div>
  );
}