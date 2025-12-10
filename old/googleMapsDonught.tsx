<div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {/* Google Maps */}
        <div
          className="animate-fade-in-up"
          style={{
            background: colors.card,
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: `1px solid ${colors.border}`,
            animationDelay: "0.4s",
          }}>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: colors.textPrimary,
              marginBottom: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            {t("Warehouse Map")}
          </h2>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "320px",
              background: colors.background,
              borderRadius: "0.75rem",
              overflow: "hidden",
            }}
          >
            <GoogleMapsContainer
              apiKey={apiKey}
              locations={computedLocations}
              mode={mode}
              accentColor={colors.action}
            />
          </div>
        </div>

        {/* Donut Chart */}
        <div
          className="animate-fade-in-up"
          style={{
            background: colors.card,
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: `1px solid ${colors.border}`,
            animationDelay: "0.5s",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: colors.textPrimary,
              marginBottom: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            {t("Locations by Type")}
          </h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.5rem",
                    color: colors.textPrimary,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: d.color }} />
                  <span style={{ color: colors.textSecondary, fontSize: "0.8rem", fontWeight: "500" }}>{d.name}</span>
                </div>
                <span style={{ color: colors.textPrimary, fontWeight: "600", fontSize: "0.9rem" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div> 